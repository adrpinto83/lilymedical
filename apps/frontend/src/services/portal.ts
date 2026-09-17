import { api } from "./api";
import { Paciente, Cita, Receta, ConstanciaMedica, PlanEjercicios } from "../types";

export type MiPerfil = Pick<
  Paciente,
  | "id"
  | "nombres"
  | "apellidos"
  | "documento"
  | "fechaNacimiento"
  | "sexo"
  | "telefono"
  | "email"
  | "direccion"
  | "contactoEmergenciaNombre"
  | "contactoEmergenciaTelefono"
>;

export interface ResumenClinico {
  motivoConsulta?: string | null;
  diagnosticoPrincipal?: string | null;
  codigoCIE10?: string | null;
  alergias?: string | null;
}

export interface MisDocumentos {
  recetas: Receta[];
  constancias: ConstanciaMedica[];
  planesEjercicios: PlanEjercicios[];
}

export async function obtenerMiPerfil(): Promise<MiPerfil> {
  const { data } = await api.get<MiPerfil>("/portal/perfil");
  return data;
}

export async function actualizarMiPerfil(payload: {
  telefono?: string;
  direccion?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}): Promise<MiPerfil> {
  const { data } = await api.put<MiPerfil>("/portal/perfil", payload);
  return data;
}

export async function obtenerMiResumenClinico(): Promise<ResumenClinico | null> {
  const { data } = await api.get<ResumenClinico | null>("/portal/resumen-clinico");
  return data;
}

export async function misCitas(): Promise<Cita[]> {
  const { data } = await api.get<Cita[]>("/portal/citas");
  return data;
}

export async function misDocumentos(): Promise<MisDocumentos> {
  const { data } = await api.get<MisDocumentos>("/portal/documentos");
  return data;
}

async function abrirPdf(url: string): Promise<void> {
  const { data } = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  window.open(blobUrl, "_blank");
}

export function abrirPdfMiReceta(id: string): Promise<void> {
  return abrirPdf(`/portal/documentos/recetas/${id}/pdf`);
}

export function abrirPdfMiConstancia(id: string): Promise<void> {
  return abrirPdf(`/portal/documentos/constancias/${id}/pdf`);
}

export function abrirPdfMiPlan(id: string): Promise<void> {
  return abrirPdf(`/portal/documentos/planes-ejercicios/${id}/pdf`);
}
