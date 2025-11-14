import { getCourseMessage, getMarksCount } from "@/helpers";
import { getCalificaciones, getModulos } from "@/services/UBioBio";
import { Career } from "@/types/Career";
import { Course } from "@/types/Course";
import { Asignatura, Modulo } from "@/types/UBioBioResponses";

const expandModularCourses = async (courses: Course[], careerInfo: Career, env: Env): Promise<Course[]> => {
  const indicesToRemove: number[] = [];
  await Promise.all(
    courses.map(async (course, index) => {
      if (course.modular) {
        const newCourses: Course[] = [];
        const modulos = await getModulos(course, env);
        if (modulos.length > 0) {
          modulos.forEach((mod) => {
            const other = `${careerInfo.careerCode}/${careerInfo.pcaCode}/${mod.mod_numero}/${mod.ddo_correlativo}`;
            newCourses.push(formatModule(course, mod, other));
          });
          indicesToRemove.push(index);
          newCourses.forEach((nc) => courses.push(nc));
        } else {
          throw new Error(`No se encontraron módulos para la asignatura modular: ${course.name}`);
        }
      }
    })
  );
  indicesToRemove.sort((a, b) => b - a).forEach((index) => courses.splice(index, 1));
  return courses;
};

const findAndUpdateNewMarks = async (courses: Course[], env: Env): Promise<string[]> => {
  const newMarkMessages: string[] = [];
  await Promise.all(
    courses.map(async (course, index) => {
      const calificaciones = await getCalificaciones(course, env);
      const { total, current } = getMarksCount(calificaciones);
      if ((course.marksCount || 0) < current) {
        courses[index].marksCount = current;
        courses[index].totalMarksCount = total;
        newMarkMessages.push(getCourseMessage(courses[index]));
      }
    })
  );
  return newMarkMessages;
}

const formatCourse = (asignatura: Asignatura, year: number, semester: number) => {
  return {
    name: asignatura.agn_nombre,
    code: asignatura.agn_codigo,
    section: asignatura.mla_sec_numero,
    year,
    semester,
    modular: asignatura.sec_ind_modular !== 0,
    marksCount: 0,
    totalMarksCount: 0
  };
};

const formatModule = (course: Course, mod: Modulo, other: string) => {
  return {
    name: `${course.name} - ${mod.mod_nombre}${mod.ddo_correlativo === 2 ? "R" : ""}`,
    code: course.code,
    section: course.section,
    year: course.year,
    semester: course.semester,
    modular: course.modular,
    other,
    marksCount: 0,
    totalMarksCount: 0
  };
};

export { expandModularCourses, findAndUpdateNewMarks, formatCourse, formatModule };
