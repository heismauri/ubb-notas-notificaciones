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
		modular = false,
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
      "Cache-Control": "no-cache",
		},
	});
	if (!response.ok) {
    throw new Error("Failed to fetch marks");
	}
	return response.json();
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
