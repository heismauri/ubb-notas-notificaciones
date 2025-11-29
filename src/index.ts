import { ERROR_COLOR, sendNotification as sendDiscordNotification, SUCCESS_COLOR } from "@/services/Discord";
import { sendNotification as sendNtfyNotification } from "@/services/Ntfy";
import { getAsignaturas } from "@/services/UBioBio";
import type { Course } from "@/types/Course";
import type { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";
import {
  expandModularCourses,
  filterCompletedCourses,
  findAndUpdateNewMarks,
  formatCourse,
  getCurrentCareer
} from "@/utils/course";
import { genPayload } from "@/utils/discord";

const checkNewMarks = async (env: Env): Promise<void> => {
  const coursesKV = await env.DATA.get("courses");
  const courses: Course[] = coursesKV ? JSON.parse(coursesKV) : [];
  if (courses.length === 0) {
    throw new Error("No se encontraron cursos");
  }
  const newMarkMessages = await findAndUpdateNewMarks(courses, env);
  if (newMarkMessages.length > 0) {
    await env.NOTIFICATIONS.send(genPayload("Nuevas notas disponibles", newMarkMessages, SUCCESS_COLOR));
    await sendNtfyNotification("Nuevas notas disponibles", newMarkMessages.join("\n"), env);
    const finalCourses = filterCompletedCourses(courses);
    await env.DATA.put("courses", JSON.stringify(finalCourses));
  } else {
    console.warn("No new marks found");
  }
};

const refreshCourses = async (env: Env): Promise<void> => {
  const careerInfo = await getCurrentCareer(env);
  const asignaturas = await getAsignaturas(careerInfo, env);
  if (asignaturas.length === 0) {
    throw new Error("No se encontraron cursos");
  }
  const courses: Course[] = asignaturas.map((a) => {
    return formatCourse(a, careerInfo.year, careerInfo.semester);
  });
  await expandModularCourses(courses, careerInfo, env);
  courses.sort((a, b) => b.code - a.code);
  await findAndUpdateNewMarks(courses, env);
  const finalCourses = filterCompletedCourses(courses);
  await env.DATA.put("courses", JSON.stringify(finalCourses));
};

export default {
  async fetch(request, env): Promise<Response> {
    try {
      const url = new URL(request.url);
      switch (url.pathname) {
        case "/":
          return new Response("UBB Notas Notificaciones", { status: 200 });
        case "/refresh-courses":
          await refreshCourses(env);
          return new Response(JSON.stringify({ message: "Cursos actualizados" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        case "/check-new-marks":
          await checkNewMarks(env);
          return new Response(JSON.stringify({ message: "Revisión de nuevas notas completada" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        default:
          return new Response("No encontrado", { status: 404 });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      return new Response(JSON.stringify({ message: errorMessage }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  async scheduled(_, env): Promise<void> {
    try {
      if (env.SKIP_REFRESH_ON_SCHEDULED === "true") {
        console.warn("Skipping check for new marks");
        return;
      }
      await checkNewMarks(env);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      await env.NOTIFICATIONS.send(genPayload("Error al obtener notas", [errorMessage], ERROR_COLOR));
      await sendNtfyNotification("Error al obtener notas", errorMessage, env);
    }
  },
  async queue(batch, env): Promise<void> {
    await Promise.all(
      (batch as MessageBatch<DiscordWebhookPayload>).messages.map(async (message) => {
        const result = await sendDiscordNotification(message.body, env);
        if (result.success) {
          message.ack();
        } else if (result.retryAfter) {
          message.retry({ delaySeconds: result.retryAfter });
        } else {
          throw new Error(`Failed to send Discord notification: ${JSON.stringify(result)}`);
        }
      })
    );
  }
} satisfies ExportedHandler<Env>;
