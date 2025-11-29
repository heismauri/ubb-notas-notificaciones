export interface Calificaciones {
  calificaciones: Calificacion[];
}

export interface BaseCalificacion {
  nombre: string;
  factor: number;
  nota: string;
}

export interface Calificacion extends BaseCalificacion {
  subcal?: BaseCalificacion[];
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

export interface Carrera {
  crr_nombre: string;
  pca_codigo: number;
  crr_codigo: number;
  alc_ano_ingreso: number;
  alc_periodo: number;
  cmp_codigo: number;
  smp_codigo: number;
  situacion: string;
  ano_periodo: AnioPeriodo[];
}

export interface AnioPeriodo {
  ano: number;
  periodo: number;
}
