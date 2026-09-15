import { api } from "./api";
import { Paciente } from "../types";

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
