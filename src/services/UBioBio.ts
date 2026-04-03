import type { Career } from "@/types/Career";
import type { Course } from "@/types/Course";
import type { Asignatura, Calificaciones, Carrera, Modulo } from "@/types/UBioBioResponses";

const getHeaders = (token: string): HeadersInit => ({
  "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
  "Authorization": `Bearer ${token}`,
  "Pragma": "no-cache",
  "Cache-Control": "no-cache"
});

const getAsignaturas = async (career: Career, run: string, env: Env, firstTry = true): Promise<Asignatura[]> => {
  const url =
    `${env.BASE_URL}/calificaciones/get_asignaturas/${run}/${career.code}/${career.pcaCode}/` +
    `${career.admissionYear}/${career.admissionSemester}/${career.year}/${career.semester}`;
  const response = await fetch(url, { headers: getHeaders(env.TOKEN) });
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    if (firstTry) {
      return getAsignaturas(career, run, env, false);
    }
    throw new Error("No se pudieron obtener las asignaturas");
  }
  return response.json();
};

const getCalificaciones = async (course: Course, run: string, env: Env, firstTry = true): Promise<Calificaciones> => {
  const url =
    `${env.BASE_URL}/calificaciones/get_calificaciones${course.modular ? "_modular" : ""}/${run}` +
    `/${course.code}/${course.section}/${course.year}/${course.semester}${course.other ? `/${course.other}` : ""}`;
  const response = await fetch(url, { headers: getHeaders(env.TOKEN) });
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    if (firstTry) {
      return getCalificaciones(course, run, env, false);
    }
    throw new Error("No se pudieron obtener las notas");
  }
  return response.json();
};

const getCarreras = async (run: string, env: Env, firstTry = true): Promise<Carrera[]> => {
  const url = `${env.BASE_URL}/v2/config/get_carreras/${run}`;
  const response = await fetch(url, { headers: getHeaders(env.TOKEN) });
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    if (firstTry) {
      return getCarreras(run, env, false);
    }
    throw new Error("No se pudieron obtener las carreras");
  }
  return response.json();
};

const getModulos = async (course: Course, run: string, env: Env, firstTry = true): Promise<Modulo[]> => {
  const url =
    `${env.BASE_URL}/calificaciones/get_modulos/${course.code}/${course.section}/${course.year}` +
    `/${course.semester}`;
  const response = await fetch(url, { headers: getHeaders(env.TOKEN) });
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    if (firstTry) {
      return getModulos(course, run, env, false);
    }
    throw new Error("No se pudieron obtener los módulos");
  }
  return response.json();
};

export { getAsignaturas, getCalificaciones, getCarreras, getModulos };
