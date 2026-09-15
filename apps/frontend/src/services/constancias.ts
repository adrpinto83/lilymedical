import { api } from "./api";
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

export async function abrirPdfConstancia(id: string): Promise<void> {
  const { data } = await api.get(`/constancias/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  window.open(url, "_blank");
}
