import { ERROR_COLOR, sendNotification as sendDiscordNotification, SUCCESS_COLOR } from "@/services/Discord";
import { sendNotification as sendNtfyNotification } from "@/services/Ntfy";
import type { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";
import { filterCompletedCourses, findAndUpdateNewMarks, getCourses, retrieveCourses } from "@/utils/course";
import { genPayload } from "@/utils/discord";
import { retrieveStudents } from "@/utils/student";

const checkNewMarks = async (env: Env): Promise<void> => {
  const courses = await retrieveCourses(env);
  const students = await retrieveStudents(env);
  const newMarkMessages = await findAndUpdateNewMarks(courses, students, env);
  if (newMarkMessages.length > 0) {
    const groupedMessages = newMarkMessages.reduce(
      (acc, { title, message }) => {
        if (!acc[title]) {
          acc[title] = [];
        }
        acc[title].push(message);
        return acc;
      },
      {} as Record<string, string[]>
    );
    await Promise.all(
      Object.entries(groupedMessages).map(async ([title, messages]) => {
        await env.NOTIFICATIONS.send(genPayload(title, messages, SUCCESS_COLOR));
        await sendNtfyNotification(title, messages.join("\n"), env);
      })
    );
    const finalCourses = filterCompletedCourses(courses);
    await env.DATA.put("courses", JSON.stringify(finalCourses));
  } else {
    console.warn("No new marks found");
  }
};

const refreshCourses = async (env: Env): Promise<void> => {
  const students = await retrieveStudents(env);
  const courses = await getCourses(students, env);
  await env.DATA.put("courses", JSON.stringify(courses));
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
