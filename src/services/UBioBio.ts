import type { Asignatura, Calificaciones, Carrera, Modulo } from "@/types/UBioBioResponses";

const getAsignaturas = async (
  {
    careerCode,
    pcaCode,
    admissionYear,
    admissionSemester,
    year,
    semester
  }: {
    careerCode: number;
    pcaCode: number;
    admissionYear: number;
    admissionSemester: number;
    year: number;
    semester: number;
  },
  env: Env
): Promise<Asignatura[]> => {
  const response = await fetch(
    `${env.BASE_URL}/calificaciones/get_asignaturas/${env.RUN}/${careerCode}/${pcaCode}/${admissionYear}/` +
      `${admissionSemester}/${year}/${semester}`,
    {
      headers: {
        "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
        "Authorization": `Bearer ${env.TOKEN}`,
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      }
    }
  );
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    throw new Error("No se pudieron obtener las asignaturas");
  }
  return response.json();
};

const getCalificaciones = async (
  {
    code,
    section,
    year,
    semester,
    other,
    modular = false
  }: { code: number; section: number; year: number; semester: number; other?: string; modular?: boolean },
  env: Env
): Promise<Calificaciones> => {
  const response = await fetch(
    `${env.BASE_URL}/calificaciones/get_calificaciones${modular ? "_modular" : ""}/${
      env.RUN
    }/${code}/${section}/${year}/` + `${semester}${other ? `/${other}` : ""}`,
    {
      headers: {
        "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
        "Authorization": `Bearer ${env.TOKEN}`,
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      }
    }
  );
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    throw new Error("No se pudieron obtener las notas");
  }
  return response.json();
};

const getCarreras = async (env: Env): Promise<Carrera[]> => {
  const response = await fetch(`${env.BASE_URL}/v2/config/get_carreras/${env.RUN}`, {
    headers: {
      "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
      "Authorization": `Bearer ${env.TOKEN}`,
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
    }
  });
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    throw new Error("No se pudieron obtener las carreras");
  }
  return response.json();
};

const getModulos = async (
  { code, section, year, semester }: { code: number; section: number; year: number; semester: number },
  env: Env
): Promise<Modulo[]> => {
  const response = await fetch(`${env.BASE_URL}/calificaciones/get_modulos/${code}/${section}/${year}/${semester}`, {
    headers: {
      "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
      "Authorization": `Bearer ${env.TOKEN}`,
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
    }
  });
  if (response.status === 401) {
    throw new Error("El token de autenticación es inválido o ha expirado");
  }
  if (!response.ok) {
    throw new Error("No se pudieron obtener los módulos");
  }
  return response.json();
};

export { getAsignaturas, getCalificaciones, getCarreras, getModulos };
