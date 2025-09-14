import { genErrorPayload, genPayload, getCourseMessage, getMarksCount } from "@/helpers";
import { getAsignaturas, getCalificaciones, getCarreras, getModulos } from "@/services/UBioBio";
import type { Course } from "@/types/Course";
import type { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";

const sendDiscordNotification = async (
  payload: DiscordWebhookPayload,
  env: Env
): Promise<{ success: boolean; retryAfter?: number }> => {
  const response = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (response.ok) {
    return { success: true };
  }
  if (response.status === 429) {
    try {
      const data: { retry_after?: number } = await response.json();
      const retryAfter = Math.ceil(data.retry_after || 1);
      return { success: false, retryAfter };
    } catch {
      const retryAfter = Math.ceil(Number(response.headers.get("x-ratelimit-reset-after")));
      return { success: false, retryAfter };
    }
  }
  return { success: false };
};

const checkNewMarks = async (env: Env) => {
  const coursesKV = await env.DATA.get("courses");
  const courses: Course[] = coursesKV ? JSON.parse(coursesKV) : [];
  if (courses.length === 0) {
    throw new Error("No se encontraron cursos");
  }
  const newMarkMessages: string[] = [];
  await Promise.all(
    courses.map(async (course) => {
      const calificaciones = await getCalificaciones(course, env);
      const marksCount = getMarksCount(calificaciones);
      if ((course.marksCount || 0) < marksCount) {
        course.marksCount = marksCount;
        newMarkMessages.push(getCourseMessage(course));
      }
    })
  );
  if (newMarkMessages.length > 0) {
    await env.NOTIFICATIONS.send(newMarkMessages);
    await env.DATA.put("courses", JSON.stringify(courses));
  } else {
    console.log("No hay nuevas notas");
  }
  return newMarkMessages;
};

const getCurrentCareer = async (env: Env) => {
  const carreras = await getCarreras(env);
  if (carreras.length === 0) {
    throw new Error("No se encontraron carreras");
  }
  if (carreras.length > 1) {
    carreras.sort((a, b) => {
      if (a.ano_periodo[0].ano !== b.ano_periodo[0].ano) {
        return b.ano_periodo[0].ano - a.ano_periodo[0].ano;
      }
      return b.ano_periodo[0].periodo - a.ano_periodo[0].periodo;
    });
  }
  const carrera = carreras[0];
  const currentPeriod = carrera.ano_periodo.sort((a, b) => {
    if (a.ano !== b.ano) {
      return b.ano - a.ano;
    }
    return b.periodo - a.periodo;
  })[0];
  return {
    careerCode: carrera.crr_codigo,
    pcaCode: carrera.pca_codigo,
    admissionYear: carrera.alc_ano_ingreso,
    admissionSemester: carrera.alc_periodo,
    currentYear: currentPeriod.ano,
    currentSemester: currentPeriod.periodo
  };
};

const refreshCourses = async (env: Env) => {
  const careerInfo = await getCurrentCareer(env);
  const asignaturas = await getAsignaturas(
    {
      careerCode: careerInfo.careerCode,
      pcaCode: careerInfo.pcaCode,
      admissionYear: careerInfo.admissionYear,
      admissionSemester: careerInfo.admissionSemester,
      year: careerInfo.currentYear,
      semester: careerInfo.currentSemester
    },
    env
  );
  if (asignaturas.length === 0) {
    throw new Error("No se encontraron cursos");
  }
  const courses: Course[] = asignaturas.map((a) => {
    return {
      name: a.agn_nombre,
      code: a.agn_codigo,
      section: a.mla_sec_numero,
      modular: a.sec_ind_modular !== 0,
      year: careerInfo.currentYear,
      semester: careerInfo.currentSemester,
      marksCount: 0
    };
  });
  const indicesToRemove: number[] = [];
  await Promise.all(
    courses.map(async (course, idx) => {
      if (course.modular) {
        const modulos = await getModulos(course, env);
        if (modulos.length > 0) {
          modulos.map((mod) => {
            const other = `${careerInfo.careerCode}/${careerInfo.pcaCode}/${mod.mod_numero}/${mod.ddo_correlativo}`;
            courses.push({
              name: `${course.name} - ${mod.mod_nombre}${mod.ddo_correlativo === 2 ? "R" : ""}`,
              code: course.code,
              section: course.section,
              year: course.year,
              semester: course.semester,
              modular: course.modular,
              other,
              marksCount: 0
            });
          });
          indicesToRemove.push(idx);
        } else {
          throw new Error(`No se encontraron módulos para la asignatura modular: ${course.name}`);
        }
      }
    })
  );
  indicesToRemove.sort((a, b) => b - a).forEach((idx) => courses.splice(idx, 1));
  courses.sort((a, b) => b.code - a.code);
  await Promise.all(
    courses.map(async (course) => {
      const calificaciones = await getCalificaciones(course, env);
      course.marksCount = getMarksCount(calificaciones);
    })
  );
  await env.DATA.put("courses", JSON.stringify(courses));
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      switch (url.pathname) {
        case "/":
          await refreshCourses(env);
          return new Response(JSON.stringify({ success: true, message: "Cursos actualizados" }), { status: 200 });
        default:
          return new Response(JSON.stringify({ success: false, message: "No encontrado" }), { status: 404 });
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      return new Response(JSON.stringify({ success: false, message: errorMessage }), { status: 422 });
    }
  },
  async scheduled(_, env) {
    try {
      await checkNewMarks(env);
      return;
    } catch (error) {
      await env.NOTIFICATIONS.send(genErrorPayload(error as Error));
      return;
    }
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const payload = genPayload(message.body as string[]);
      const { success, retryAfter } = await sendDiscordNotification(payload, env);
      if (success) {
        message.ack();
        continue;
      }
      if (retryAfter) {
        message.retry({ delaySeconds: retryAfter });
      }
    }
  }
} satisfies ExportedHandler<Env>;
