export interface MarksResponse {
	calificaciones: Calificaciones[];
}

export interface Calificaciones {
	nombre: string;
	factor: number;
	nota: string;
}
