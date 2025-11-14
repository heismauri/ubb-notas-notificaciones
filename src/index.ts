import { genErrorPayload, genPayload } from "@/helpers";
import { sendNotification as sendDiscordNotification } from "@/services/Discord";
import { sendNotification as sendNtfyNotification } from "@/services/Ntfy";
import { getAsignaturas } from "@/services/UBioBio";
import type { Course } from "@/types/Course";
import type { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";
import { expandModularCourses, findAndUpdateNewMarks, formatCourse, getCurrentCareer } from "@/utils/course";

const checkNewMarks = async (env: Env) => {
  const coursesKV = await env.DATA.get("courses");
  const courses: Course[] = coursesKV ? JSON.parse(coursesKV) : [];
  if (courses.length === 0) {
    throw new Error("No se encontraron cursos");
  }
  const newMarkMessages = await findAndUpdateNewMarks(courses, env);
  if (newMarkMessages.length > 0) {
    await env.NOTIFICATIONS.send(genPayload(newMarkMessages));
    await sendNtfyNotification("Nuevas notas disponibles", newMarkMessages.join("\n"), env);
    await env.DATA.put("courses", JSON.stringify(courses));
  }
  return newMarkMessages;
};

const refreshCourses = async (env: Env) => {
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
          throw new Error(`Failed to send Discord notification: ${JSON.stringify(result)}`);
        }
      })
    );
  }
} satisfies ExportedHandler<Env>;
