import type { Asignatura, Calificaciones, Modulo } from "@/types/UBioBioResponses";

const getAsignaturas = async (
  { year, semester }: { year: number; semester: number },
  env: Env
): Promise<Asignatura[]> => {
  const response = await fetch(
    `${env.BASE_URL}/get_asignaturas/${env.RUN}/${env.CARRER_CODE}/${env.PCA_CODE}/${env.ADMISSION_YEAR}/${env.ADMISSION_SEMESTER}/${year}/${semester}`,
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
    `${env.BASE_URL}/get_calificaciones${modular ? "_modular" : ""}/${env.RUN}/${code}/${section}/${year}/${semester}${
      other ? `/${other}` : ""
    }`,
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

const getModulos = async (
  {
    code,
    section,
    year,
    semester
  }: {
    code: number;
    section: number;
    year: number;
    semester: number;
  },
  env: Env
): Promise<Modulo[]> => {
  const response = await fetch(`${env.BASE_URL}/get_modulos/${code}/${section}/${year}/${semester}`, {
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

export { getAsignaturas, getCalificaciones, getModulos };
