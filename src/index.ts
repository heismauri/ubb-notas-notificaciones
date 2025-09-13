import { genErrorPayload, genPayload, getCourseMessage, getMarksCount } from "@/helpers";
import { getCalificaciones } from "@/services/UBioBio";
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

const checkAndNotifyNewMarks = async (env: Env, enableNotifications: boolean = true) => {
  const coursesKV = await env.DATA.get("courses");
  const courses: Course[] = coursesKV ? JSON.parse(coursesKV) : [];
  if (courses.length === 0) {
    throw new Error("No se encontraron cursos");
  }
  const newMarkMessages: string[] = [];
  await Promise.all(
    courses.map(async (course) => {
      const response = await getCalificaciones(course, env);
      const marksCount = getMarksCount(response);
      if ((course.marksCount || 0) < marksCount) {
        course.marksCount = marksCount;
        newMarkMessages.push(getCourseMessage(course));
      }
    })
  );
  if (newMarkMessages.length > 0) {
    if (enableNotifications) {
      await env.NOTIFICATIONS.send(newMarkMessages);
    }
    await env.DATA.put("courses", JSON.stringify(courses));
  } else {
    console.log("No hay nuevas notas");
  }
  return newMarkMessages;
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      switch (url.pathname) {
        case "/":
          const newMarkMessages = await checkAndNotifyNewMarks(env, true);
          return new Response(JSON.stringify({ success: true, newMarkMessages }), { status: 200 });
        default:
          return new Response(JSON.stringify({ error: "No encontrado" }), { status: 404 });
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      return new Response(JSON.stringify({ error: errorMessage }), { status: 422 });
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
