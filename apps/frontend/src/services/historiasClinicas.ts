import { api } from "./api";
import { HistoriaClinica, EvaluacionFisiatrica } from "../types";

export async function obtenerHistoriaPorPaciente(pacienteId: string): Promise<HistoriaClinica> {
  const { data } = await api.get<HistoriaClinica>(`/historias-clinicas/paciente/${pacienteId}`);
  return data;
}

export async function actualizarHistoria(
  pacienteId: string,
  payload: Partial<HistoriaClinica>
): Promise<HistoriaClinica> {
  const { data } = await api.put<HistoriaClinica>(
    `/historias-clinicas/paciente/${pacienteId}`,
    payload
  );
  return data;
}

export async function agregarEvaluacion(
  pacienteId: string,
  payload: {
    tipoEscala: string;
    nombreEscala?: string;
    datos: Record<string, unknown>;
    puntajeTotal?: number;
    observaciones?: string;
  }
): Promise<EvaluacionFisiatrica> {
  const { data } = await api.post<EvaluacionFisiatrica>(
    `/historias-clinicas/paciente/${pacienteId}/evaluaciones`,
    payload
  );
  return data;
}

export async function obtenerLineaDeTiempo(pacienteId: string) {
  const { data } = await api.get(`/historias-clinicas/paciente/${pacienteId}/linea-tiempo`);
  return data;
}

export interface OpcionesExportarHistoria {
  desde?: string;
  hasta?: string;
  incluirImagenes?: boolean;
}

export async function abrirPdfHistoriaClinica(
  pacienteId: string,
  opciones?: OpcionesExportarHistoria
): Promise<void> {
  const params: Record<string, string> = {};
  if (opciones?.desde) params.desde = opciones.desde;
  if (opciones?.hasta) params.hasta = opciones.hasta;
  if (opciones?.incluirImagenes) params.incluirImagenes = "true";

  const { data } = await api.get(`/historias-clinicas/paciente/${pacienteId}/pdf`, {
    responseType: "blob",
    params,
  });
  const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  window.open(url, "_blank");
}
