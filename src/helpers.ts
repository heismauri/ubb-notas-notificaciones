import type { Course } from "@/types/Course";
import type { Calificaciones } from "@/types/UBioBioResponses";

const getMarksCount = (marksResponse: Calificaciones): { total: number, current: number } => {
  const total = marksResponse.calificaciones.flatMap((calificacion) => {
    const subgrades = calificacion.subcal || [];
    return [calificacion.nota, ...subgrades.map((subcal) => subcal.nota)];
  });
  return { total: total.length, current: total.filter((mark) => parseFloat(mark) > 0).length };
};

const getCourseMessage = (course: Course) => {
  return `La asignatura **"${course.name}"** (${course.code}-${course.section}) subió una nueva nota`;
};

const genPayload = (title: string, messages: string[], color: number) => {
  return {
    content: null,
    embeds: [
      {
        title,
        description: messages.join("\n"),
        color
      }
    ]
  };
};

export { genPayload, getCourseMessage, getMarksCount };
