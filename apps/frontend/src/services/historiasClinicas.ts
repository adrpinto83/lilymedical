import { api } from "./api";
import { abrirPdf, descargarPdf, imprimirPdf } from "./pdf";
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

function paramsHistoria(opciones?: OpcionesExportarHistoria): Record<string, string> {
  const params: Record<string, string> = {};
  if (opciones?.desde) params.desde = opciones.desde;
  if (opciones?.hasta) params.hasta = opciones.hasta;
  if (opciones?.incluirImagenes) params.incluirImagenes = "true";
  return params;
}

export function abrirPdfHistoriaClinica(pacienteId: string, opciones?: OpcionesExportarHistoria): Promise<void> {
  return abrirPdf(
    () => descargarPdf(`/historias-clinicas/paciente/${pacienteId}/pdf`, paramsHistoria(opciones)),
    "historia-clinica.pdf"
  );
}

export function imprimirPdfHistoriaClinica(pacienteId: string, opciones?: OpcionesExportarHistoria): Promise<void> {
  return imprimirPdf(
    () => descargarPdf(`/historias-clinicas/paciente/${pacienteId}/pdf`, paramsHistoria(opciones)),
    "historia-clinica.pdf"
  );
}

export type ReferenciaConsulta = { sesionId: string } | { evaluacionId: string };

/** Informe de una sola consulta (lo registrado ese día), para el paciente. */
export function imprimirInformeConsulta(pacienteId: string, referencia: ReferenciaConsulta): Promise<void> {
  return imprimirPdf(
    () => descargarPdf(`/historias-clinicas/paciente/${pacienteId}/consulta/pdf`, { ...referencia }),
    "informe-consulta.pdf"
  );
}
