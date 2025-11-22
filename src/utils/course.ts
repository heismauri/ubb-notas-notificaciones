import { getCalificaciones, getCarreras, getModulos } from "@/services/UBioBio";
import { Career } from "@/types/Career";
import { Course } from "@/types/Course";
import { Asignatura, Calificaciones, Modulo } from "@/types/UBioBioResponses";

const expandModularCourses = async (courses: Course[], careerInfo: Career, env: Env): Promise<Course[]> => {
  const indicesToRemove: number[] = [];
  await Promise.all(
    courses.map(async (course, index) => {
      if (course.modular) {
        const newCourses: Course[] = [];
        const modulos = await getModulos(course, env);
        if (modulos.length > 0) {
          modulos.forEach((mod) => {
            const other = `${careerInfo.code}/${careerInfo.pcaCode}/${mod.mod_numero}/${mod.ddo_correlativo}`;
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
};

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

const getCourseMessage = (course: Course) => {
  return `La asignatura **"${course.name}"** (${course.code}-${course.section}) subió una nueva nota`;
};

const getCurrentCareer = async (env: Env) => {
  const carreras = await getCarreras(env);
  if (carreras.length === 0) {
    throw new Error("No se encontraron carreras");
  }
  if (carreras.length > 1) {
    carreras.sort((a, b) => {
      if (a.ano_periodo[0].ano !== b.ano_periodo[0].ano) {
        return b.ano_periodo[0].ano - a.ano_periodo[0].ano;
      }
      return b.ano_periodo[0].periodo - a.ano_periodo[0].periodo;
    });
  }
  const carrera = carreras[0];
  const currentPeriod = carrera.ano_periodo.sort((a, b) => {
    if (a.ano !== b.ano) {
      return b.ano - a.ano;
    }
    return b.periodo - a.periodo;
  })[0];
  const career: Career = {
    code: carrera.crr_codigo,
    pcaCode: carrera.pca_codigo,
    admissionYear: carrera.alc_ano_ingreso,
    admissionSemester: carrera.alc_periodo,
    year: currentPeriod.ano,
    semester: currentPeriod.periodo
  };
  return career;
};

const getMarksCount = (marksResponse: Calificaciones): { total: number; current: number } => {
  const total = marksResponse.calificaciones.flatMap((calificacion) => {
    const subgrades = calificacion.subcal || [];
    return [calificacion.nota, ...subgrades.map((subcal) => subcal.nota)];
  });
  return { total: total.length, current: total.filter((mark) => parseFloat(mark) > 0).length };
};

export { expandModularCourses, findAndUpdateNewMarks, formatCourse, formatModule, getCurrentCareer, getMarksCount };
