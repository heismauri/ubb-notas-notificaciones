import type { Course } from "@/types/Course";
import type { MarksResponse } from "@/types/MarksResponse";

const getCourseName = (code: string): string => {
  switch (code) {
    default:
      return "Nombre de asignatura desconocida";
  }
};

const fetchMarks = async (
  {
    code,
    semester,
    year,
    section,
    other,
    modular = false
  }: { code: string; semester: string; year: string; section: string; other: string; modular?: boolean },
  env: Env
): Promise<MarksResponse> => {
  const endpoint = modular ? env.MODULAR_MARKS_ENDPOINT : env.MARKS_ENDPOINT;
  const response = await fetch(`${endpoint}/${env.RUN}/${code}/${section}/${year}/${semester}/${other}`, {
    headers: {
      Accept: "*/*",
      "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
      "Accept-Language": "en-US,en;q=0.9",
      Authorization: `Bearer ${env.TOKEN}`,
      Pragma: "no-cache",
      "Cache-Control": "no-cache"
    }
  });
  if (!response.ok) {
    throw new Error("Failed to fetch marks");
  }
  return response.json();
};

const getMarksCount = (marksResponse: MarksResponse) => {
  return marksResponse.calificaciones.flatMap((calificacion) => {
    const subgrades = calificacion.subcal || [];
    return [calificacion.nota, ...subgrades.map((subcal) => subcal.nota)].filter((mark) => mark !== "");
  }).length;
};

const getCourseMessage = (course: Course) => {
  const courseName = getCourseName(course.code);
  return `El ramo **"${courseName}"** (${course.code}) acaba de subir nuevas notas`;
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

const sendNotification = async (
  env: Env,
  payload: { content: string | null; embeds: { title: string; description: string; color: number }[] }
) => {
  const response = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to send notification");
  }
};

const handleFetch = async (env: Env) => {
  const coursesKV = await env.ubbnotas.get("courses");
  const courses: Course[] = coursesKV ? JSON.parse(coursesKV) : [];
  const newMarkMessages: string[] = [];
  await Promise.all(
    courses.map(async (course) => {
      const response = await fetchMarks(course, env);
      const marksCount = getMarksCount(response);
      if ((course.marksCount || 0) < marksCount) {
        course.marksCount = marksCount;
        newMarkMessages.push(getCourseMessage(course));
      }
    })
  );
  if (newMarkMessages.length > 0) {
    const payload = genPayload(newMarkMessages);
    await sendNotification(env, payload);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export default {
  async fetch(_, env): Promise<Response> {
    try {
      return handleFetch(env);
    } catch (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }
  }
} satisfies ExportedHandler<Env>;
