export interface Calificaciones {
  calificaciones: Calificacion[];
}

export interface Calificacion {
  nombre: string;
  factor: number;
  nota: string;
  subcal?: Calificacion[];
}

export interface Asignatura {
  agn_codigo: number;
  agn_nombre: string;
  mla_sec_numero: number;
  sec_ind_modular: number;
}
