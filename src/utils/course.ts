import { getCalificaciones, getCarreras, getModulos } from "@/services/UBioBio";
import { Career } from "@/types/Career";
import { Course } from "@/types/Course";
import { Asignatura, Calificaciones, Modulo } from "@/types/UBioBioResponses";

const EMPTY_MARK = 0.0;

const filterCompletedCourses = (courses: Course[]): Course[] => {
  return courses.filter((course) => course.totalMarksCount === 0 || course.marksCount !== course.totalMarksCount);
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

const formatCourse = async (asignatura: Asignatura, careerInfo: Career, env: Env): Promise<Course[]> => {
  const mainCourse = {
    name: asignatura.agn_nombre,
    code: asignatura.agn_codigo,
    section: asignatura.mla_sec_numero,
    year: careerInfo.year,
    semester: careerInfo.semester,
    modular: asignatura.sec_ind_modular !== 0,
    marksCount: 0,
    totalMarksCount: 0
  };
  if (mainCourse.modular) {
    const modCourses: Course[] = [];
    const modulos = await getModulos(mainCourse, env);
    if (modulos.length <= 0) {
      throw new Error(`No se encontraron módulos para la asignatura modular: ${mainCourse.name}`);
    }

    modulos.forEach((mod) => {
      const other = `${careerInfo.code}/${careerInfo.pcaCode}/${mod.mod_numero}/${mod.ddo_correlativo}`;
      modCourses.push(formatModule(mainCourse, mod, other));
    });
    return modCourses;
  }
  return [mainCourse];
};

const formatModule = (course: Course, mod: Modulo, other: string): Course => {
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

const getCourses = async (asignaturas: Asignatura[], careerInfo: Career, env: Env): Promise<Course[]> => {
  const courses: Course[] = [];
  await Promise.all(
    asignaturas.map(async (asignatura) => {
      const formattedCourses = await formatCourse(asignatura, careerInfo, env);
      courses.push(...formattedCourses);
    })
  );
  courses.sort((a, b) => b.code - a.code);
  await findAndUpdateNewMarks(courses, env);
  const finalCourses = filterCompletedCourses(courses);
  return finalCourses;
};

const getCourseMessage = (course: Course): string => {
  return `La asignatura **"${course.name}"** (${course.code}-${course.section}) subió una nueva nota`;
};

const getCurrentCareer = async (env: Env): Promise<Career> => {
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
  const allMarks = marksResponse.calificaciones.flatMap((calificacion) => {
    const subgrades = calificacion.subcal || [];
    if (subgrades.length === 0) {
      return [{ value: parseFloat(calificacion.nota) || EMPTY_MARK, weight: calificacion.factor }];
    }
    return subgrades.map((subcal) => ({
      value: parseFloat(subcal.nota) || EMPTY_MARK,
      weight: (subcal.factor / 100) * calificacion.factor
    }));
  });

  const shouldExcludeExam =
    allMarks.some((mark) => mark.value === EMPTY_MARK) ||
    Math.round(allMarks.reduce((acc, mark) => acc + mark.value * (mark.weight / 100), 0) * 10) / 10 >= 4.0;
  if (!shouldExcludeExam) {
    allMarks.push({ value: parseFloat(marksResponse.resumen.examen) || EMPTY_MARK, weight: 0 });
  }

  return { total: allMarks.length, current: allMarks.filter((mark) => mark.value !== EMPTY_MARK).length };
};

export { filterCompletedCourses, findAndUpdateNewMarks, getCourses, getCurrentCareer, getMarksCount };
