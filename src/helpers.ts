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

const getCurrentSemester = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const semester = month >= 8 ? 2 : 1;
  return semester;
}

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
        description: error instanceof Error ? error.message : "Error desconocido",
        color: 16711680
      }
    ]
  };
};

export { genErrorPayload, genPayload, getCourseMessage, getCurrentSemester, getMarksCount };
