import { getCalificaciones } from "@/services/UBioBio";
import type { Course } from "@/types/Course";
import type { Calificaciones } from "@/types/UBioBioResponses";

const getMarksCount = (marksResponse: Calificaciones) => {
  return marksResponse.calificaciones.flatMap((calificacion) => {
    const subgrades = calificacion.subcal || [];
    return [calificacion.nota, ...subgrades.map((subcal) => subcal.nota)].filter((mark) => mark !== "");
  }).length;
};

const getCourseMessage = (course: Course) => {
  return `El ramo **"${course.name}"** (${course.code}) subió una nueva nota`;
};

const genPayload = (messages: string[]) => {
  return {
    content: null,
    embeds: [
      {
        title: "¡Nuevas notas disponibles!",
        description: messages.join("\n"),
        color: 84120
      }
    ]
  };
};

const genErrorPayload = (error: Error) => {
  return {
    content: null,
    embeds: [
      {
        title: "Error al obtener notas",
        description: error.message,
        color: 16711680
      }
    ]
  };
};

const sendNotification = async (
  payload: { content: string | null; embeds: { title: string; description: string; color: number }[] },
  env: Env
) => {
  const response = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("No se pudo enviar la notificación");
  }
};

const handleFetch = async (env: Env, enableNotifications: boolean = true) => {
  const coursesKV = await env.ubbnotas.get("courses");
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
      const payload = genPayload(newMarkMessages);
      await sendNotification(payload, env);
    }
    await env.ubbnotas.put("courses", JSON.stringify(courses));
  }
  return newMarkMessages;
};

export default {
  async fetch(_, env): Promise<Response> {
    try {
      const newMarkMessages = await handleFetch(env, false);
      return new Response(JSON.stringify({ success: true, newMarkMessages }), { status: 200 });
    } catch (error) {
      const payload = genErrorPayload(error as Error);
      console.error(error);
      return new Response(JSON.stringify({ error }), { status: 422 });
    }
  },
  async scheduled(_, env) {
    try {
      await handleFetch(env);
      return;
    } catch (error) {
      const payload = genErrorPayload(error as Error);
      await sendNotification(payload, env);
      return;
    }
  }
} satisfies ExportedHandler<Env>;
