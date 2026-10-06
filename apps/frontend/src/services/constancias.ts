import { api } from "./api";
import { verPdf } from "./pdf";
import { ConstanciaMedica } from "../types";

export async function listarConstanciasPorPaciente(pacienteId: string): Promise<ConstanciaMedica[]> {
  const { data } = await api.get<ConstanciaMedica[]>(`/constancias/paciente/${pacienteId}`);
  return data;
}

export async function crearConstancia(payload: {
  pacienteId: string;
  diagnostico?: string;
  codigoCIE10?: string;
  diasReposo?: number;
  fechaInicioReposo?: string;
  fechaFinReposo?: string;
  motivo: string;
}): Promise<ConstanciaMedica> {
  const { data } = await api.post<ConstanciaMedica>("/constancias", payload);
  return data;
}

export function abrirPdfConstancia(id: string): Promise<void> {
  return verPdf(`/constancias/${id}/pdf`);
}
