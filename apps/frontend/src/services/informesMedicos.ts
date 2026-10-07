import { api } from "./api";
import { verPdf } from "./pdf";
import { InformeMedico } from "../types";

export async function listarInformesPorPaciente(pacienteId: string): Promise<InformeMedico[]> {
  const { data } = await api.get<InformeMedico[]>(`/informes-medicos/paciente/${pacienteId}`);
  return data;
}

export async function crearInformeMedico(payload: {
  pacienteId: string;
  informe: string;
  indicaciones?: string;
  fecha?: string;
}): Promise<InformeMedico> {
  const { data } = await api.post<InformeMedico>("/informes-medicos", payload);
  return data;
}

export async function cambiarFechaInformeMedico(id: string, fecha: string): Promise<InformeMedico> {
  const { data } = await api.put<InformeMedico>(`/informes-medicos/${id}/fecha`, { fecha });
  return data;
}

export function abrirPdfInformeMedico(id: string): Promise<void> {
  return verPdf(`/informes-medicos/${id}/pdf`, "informe-medico.pdf");
}
