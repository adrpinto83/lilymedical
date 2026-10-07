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

export interface InformeConsulta {
  dia: string; // AAAA-MM-DD, día de la consulta
  fechaConsulta: string;
  sesiones: number;
  evaluaciones: number;
  referencia: ReferenciaConsulta;
  fechaInforme: string | null;
}

/** Informes de consulta del paciente (uno por día), para Documentos. */
export async function listarInformesConsulta(pacienteId: string): Promise<InformeConsulta[]> {
  const { data } = await api.get<InformeConsulta[]>(`/historias-clinicas/paciente/${pacienteId}/informes-consulta`);
  return data;
}

/** Cambia la fecha con que sale el informe; null vuelve a la de la consulta. */
export async function cambiarFechaInformeConsulta(pacienteId: string, dia: string, fecha: string | null) {
  await api.put(`/historias-clinicas/paciente/${pacienteId}/informes-consulta/fecha`, { dia, fecha });
}

/** Informe de consulta desde Documentos: sale con la fecha puesta al informe. */
export function abrirPdfInformeConsulta(pacienteId: string, referencia: ReferenciaConsulta): Promise<void> {
  return abrirPdf(
    () =>
      descargarPdf(`/historias-clinicas/paciente/${pacienteId}/consulta/pdf`, {
        ...referencia,
        conFechaInforme: "true",
      }),
    "informe-consulta.pdf"
  );
}
