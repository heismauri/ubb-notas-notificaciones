import { genErrorPayload, genPayload, getCourseMessage, getMarksCount } from "@/helpers";
import { getAsignaturas, getCalificaciones, getCarreras, getModulos } from "@/services/UBioBio";
import type { Course } from "@/types/Course";
import type { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";

const sendNtfyNotification = async (title: string, message: string, env: Env) => {
  try {
    const response = await fetch(env.NTFY_URL, {
      method: "POST",
      headers: {
        Title: title
      },
      body: message.replace(/\*\*/g, "")
    });
    if (!response.ok) {
      throw new Error(`Error enviando notificación a ntfy: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error("Error enviando notificación a ntfy:", (error as Error).message);
  }
};

const sendDiscordNotification = async (
  payload: DiscordWebhookPayload,
  env: Env
): Promise<{ success: boolean; retryAfter?: number; status?: number; body?: string; error?: string }> => {
  try {
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
    const body = await response.text();
    if (response.status === 429) {
      try {
        const data: { retry_after?: number } = JSON.parse(body);
        const retryAfter = Math.ceil(data.retry_after || 1);
        return { success: false, retryAfter };
      } catch {
        const headerValue = response.headers.get("x-ratelimit-reset-after");
        const retryAfter = Math.ceil(Number(headerValue) || 1);
        return { success: false, retryAfter };
      }
    }
    return { success: false, status: response.status, body };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
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
      const { total, current } = getMarksCount(calificaciones);
      if ((course.marksCount || 0) < current) {
        course.marksCount = current;
        course.totalMarksCount = total;
        newMarkMessages.push(getCourseMessage(course));
      }
    })
  );
  if (newMarkMessages.length > 0) {
    await sendNtfyNotification("Nuevas notas disponibles", newMarkMessages.join("\n"), env);
    await env.NOTIFICATIONS.send(genPayload(newMarkMessages));
    await env.DATA.put("courses", JSON.stringify(courses));
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
      marksCount: 0,
      totalMarksCount: 0
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
              marksCount: 0,
              totalMarksCount: 0
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
      const { total, current } = getMarksCount(calificaciones);
      course.marksCount = current;
      course.totalMarksCount = total;
    })
  );
  const finalCourses = courses.filter(
    (course) => course.totalMarksCount === 0 || course.marksCount !== course.totalMarksCount
  );
  await env.DATA.put("courses", JSON.stringify(finalCourses));
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      switch (url.pathname) {
        case "/":
          await refreshCourses(env);
          return new Response(JSON.stringify({ message: "Cursos actualizados" }), { status: 200 });
        default:
          return new Response(JSON.stringify({ message: "No encontrado" }), { status: 404 });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      return new Response(JSON.stringify({ message: errorMessage }), { status: 422 });
    }
  },
  async scheduled(_, env) {
    try {
      await checkNewMarks(env);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      await env.NOTIFICATIONS.send(genErrorPayload(errorMessage));
      await sendNtfyNotification("Error al obtener notas", errorMessage, env);
    }
  },
  async queue(batch, env) {
    await Promise.all(
      batch.messages.map(async (message) => {
        const result = await sendDiscordNotification(message.body as DiscordWebhookPayload, env);
        if (result.success) {
          message.ack();
        } else if (result.retryAfter) {
          message.retry({ delaySeconds: result.retryAfter });
        } else {
          throw new Error(`${JSON.stringify(result)}`);
        }
      })
    );
  }
} satisfies ExportedHandler<Env>;
