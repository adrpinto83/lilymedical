import { api } from "./api";
import { Paciente, PacienteAseguradora } from "../types";

export async function listarPacientes(busqueda?: string): Promise<Paciente[]> {
  const { data } = await api.get<Paciente[]>("/pacientes", { params: { q: busqueda } });
  return data;
}

export async function obtenerPaciente(id: string): Promise<Paciente> {
  const { data } = await api.get<Paciente>(`/pacientes/${id}`);
  return data;
}

export async function crearPaciente(payload: Partial<Paciente>): Promise<Paciente> {
  const { data } = await api.post<Paciente>("/pacientes", payload);
  return data;
}

export async function actualizarPaciente(id: string, payload: Partial<Paciente>): Promise<Paciente> {
  const { data } = await api.put<Paciente>(`/pacientes/${id}`, payload);
  return data;
}

export async function desactivarPaciente(id: string): Promise<void> {
  await api.delete(`/pacientes/${id}`);
}

export async function listarAseguradorasPaciente(pacienteId: string): Promise<PacienteAseguradora[]> {
  const { data } = await api.get<PacienteAseguradora[]>(`/pacientes/${pacienteId}/aseguradoras`);
  return data;
}

export async function agregarAseguradoraPaciente(
  pacienteId: string,
  payload: { aseguradoraId: string; numeroAfiliacion?: string; esPrimaria?: boolean }
): Promise<PacienteAseguradora> {
  const { data } = await api.post<PacienteAseguradora>(`/pacientes/${pacienteId}/aseguradoras`, payload);
  return data;
}

export async function actualizarAseguradoraPaciente(
  pacienteId: string,
  relacionId: string,
  payload: Partial<{ numeroAfiliacion: string; esPrimaria: boolean }>
): Promise<PacienteAseguradora> {
  const { data } = await api.put<PacienteAseguradora>(
    `/pacientes/${pacienteId}/aseguradoras/${relacionId}`,
    payload
  );
  return data;
}

export async function eliminarAseguradoraPaciente(pacienteId: string, relacionId: string): Promise<void> {
  await api.delete(`/pacientes/${pacienteId}/aseguradoras/${relacionId}`);
}
