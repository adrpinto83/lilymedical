import { api } from "./api";
import { Receta, TipoReceta } from "../types";

export interface ItemRecetaInput {
  medicamento?: string;
  presentacion?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  tipoTerapia?: string;
  sesiones?: number;
  observaciones?: string;
}

export async function listarRecetasPorPaciente(pacienteId: string): Promise<Receta[]> {
  const { data } = await api.get<Receta[]>(`/recetas/paciente/${pacienteId}`);
  return data;
}

export async function crearReceta(payload: {
  pacienteId: string;
  tipo: TipoReceta;
  diagnostico?: string;
  indicacionesGenerales?: string;
  fechaVencimiento?: string;
  items: ItemRecetaInput[];
}): Promise<Receta> {
  const { data } = await api.post<Receta>("/recetas", payload);
  return data;
}

// El PDF requiere el header Authorization, así que se descarga vía axios
// (que ya inyecta el token) y se abre como blob en una pestaña nueva.
export async function abrirPdfReceta(id: string): Promise<void> {
  const { data } = await api.get(`/recetas/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  window.open(url, "_blank");
}
