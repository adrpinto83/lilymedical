import { api } from "./api";
import { AutorizacionSeguro, EstadoAutorizacion } from "../types";

export async function listarAutorizacionesPaciente(pacienteId: string): Promise<AutorizacionSeguro[]> {
  const { data } = await api.get<AutorizacionSeguro[]>(`/autorizaciones/paciente/${pacienteId}`);
  return data;
}

export async function crearAutorizacion(payload: {
  pacienteId: string;
  aseguradoraId: string;
  numeroAutorizacion?: string;
  sesionesAutorizadas?: number;
  vigenciaHasta?: string;
  notas?: string;
}): Promise<AutorizacionSeguro> {
  const { data } = await api.post<AutorizacionSeguro>("/autorizaciones", payload);
  return data;
}

export async function actualizarAutorizacion(
  id: string,
  payload: Partial<{
    numeroAutorizacion: string;
    sesionesAutorizadas: number;
    estado: EstadoAutorizacion;
    vigenciaHasta: string;
    notas: string;
  }>
): Promise<AutorizacionSeguro> {
  const { data } = await api.put<AutorizacionSeguro>(`/autorizaciones/${id}`, payload);
  return data;
}

export async function eliminarAutorizacion(id: string): Promise<void> {
  await api.delete(`/autorizaciones/${id}`);
}
