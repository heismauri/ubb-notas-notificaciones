import { genErrorPayload, genPayload, getCourseMessage, getCurrentSemester, getMarksCount } from "@/helpers";
import { getAsignaturas, getCalificaciones, getModulos } from "@/services/UBioBio";
import type { Course } from "@/types/Course";
import type { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";

const sendDiscordNotification = async (payload: DiscordWebhookPayload, env: Env) => {
  const response = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (response.ok) {
    return;
  }
  if (response.status === 429) {
    const data: { retry_after?: number } = await response.json();
    const retryAfterSec = Math.ceil(data.retry_after || 1);
    const error: any = new Error("Límite de tasa alcanzado al enviar la notificación");
    error.retryAfterSec = retryAfterSec;
    throw error;
  }
  throw new Error(`No se pudo enviar la notificación: ${response.status}`);
};

const checkAndNotifyNewMarks = async (env: Env) => {
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

const refreshCourses = async (url: URL, env: Env) => {
  const year = parseInt(url.searchParams.get("year") || "") || new Date().getFullYear();
  const semester = parseInt(url.searchParams.get("semester") || "") || getCurrentSemester();
  const asignaturas = await getAsignaturas({ year, semester }, env);
  const courses: Course[] = asignaturas.map((a) => {
    return {
      name: a.agn_nombre,
      code: a.agn_codigo,
      section: a.mla_sec_numero,
      modular: a.sec_ind_modular !== 0,
      year,
      semester,
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
            const other = `${env.CARRER_CODE}/${env.PCA_CODE}/${mod.mod_numero}/${mod.ddo_correlativo}`;
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
  indicesToRemove.sort((a, b) => b - a).forEach(idx => courses.splice(idx, 1));
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
          await refreshCourses(url, env);
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
      await checkAndNotifyNewMarks(env);
      return;
    } catch (error) {
      await env.NOTIFICATIONS.send(genErrorPayload(error as Error));
      return;
    }
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const payload = genPayload(message.body as string[]);
      try {
        await sendDiscordNotification(payload, env);
        message.ack();
      } catch (error: any) {
        if (error.retryAfterSec) {
          message.retry({ delaySeconds: error.retryAfterSec });
        } else {
          message.ack();
        }
      }
    }
  }
} satisfies ExportedHandler<Env>;
