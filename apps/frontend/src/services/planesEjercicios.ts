import { api } from "./api";
import { PlanEjercicios } from "../types";

export interface ItemPlanEjercicioInput {
  nombre: string;
  descripcion?: string;
  repeticionesSugeridas?: string;
}

export async function listarPlanesPorPaciente(pacienteId: string): Promise<PlanEjercicios[]> {
  const { data } = await api.get<PlanEjercicios[]>(`/planes-ejercicios/paciente/${pacienteId}`);
  return data;
}

export async function crearPlanEjercicios(
  pacienteId: string,
  payload: { notas?: string; items: ItemPlanEjercicioInput[] }
): Promise<PlanEjercicios> {
  const { data } = await api.post<PlanEjercicios>(`/planes-ejercicios/paciente/${pacienteId}`, payload);
  return data;
}

export async function abrirPdfPlanEjercicios(id: string): Promise<void> {
  const { data } = await api.get(`/planes-ejercicios/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  window.open(url, "_blank");
}
