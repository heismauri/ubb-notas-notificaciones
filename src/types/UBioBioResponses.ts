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

export interface Modulo {
  mod_correlativo: number;
  mod_nombre: string;
  mod_numero: number;
  ddo_correlativo: number;
}
