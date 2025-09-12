import type { Asignatura, Calificaciones } from "@/types/UBioBioResponses";

const getAsignaturas = async (
  {
    careerCode,
    pcaCode,
    admissionYear,
    admissionSemester,
    year,
    semester
  }: {
    careerCode: string;
    pcaCode: string;
    admissionYear: number;
    admissionSemester: number;
    year: number;
    semester: number;
  },
  env: Env
): Promise<Asignatura[]> => {
  const response = await fetch(
    `${env.BASE_URL}/get_asignaturas/${env.RUN}/${careerCode}/${pcaCode}/${admissionYear}/${admissionSemester}/${year}/${semester}`,
    {
      headers: {
        "Accept": "*/*",
        "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": `Bearer ${env.TOKEN}`,
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      }
    }
  );
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
        "Accept": "*/*",
        "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": `Bearer ${env.TOKEN}`,
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      }
    }
  );
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
    code: string;
    section: string;
    year: string;
    semester: string;
  },
  env: Env
) => {
  const response = await fetch(`${env.BASE_URL}/get_modulos/${env.RUN}/${code}/${section}/${year}/${semester}`, {
    headers: {
      "Accept": "*/*",
      "User-Agent": "YoSoyUBB/48 CFNetwork/3826.600.41 Darwin/24.6.0",
      "Accept-Language": "en-US,en;q=0.9",
      "Authorization": `Bearer ${env.TOKEN}`,
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
    }
  });
  if (!response.ok) {
    throw new Error("No se pudieron obtener los módulos");
  }
  return response.json();
};

export { getAsignaturas, getCalificaciones, getModulos };
