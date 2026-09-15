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

export async function abrirPdfHistoriaClinica(pacienteId: string): Promise<void> {
  const { data } = await api.get(`/historias-clinicas/paciente/${pacienteId}/pdf`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  window.open(url, "_blank");
}
