import { api } from "./api";
import { Cita, BloqueoHorario } from "../types";

export async function listarCitas(desde: Date, hasta: Date, profesionalId?: string): Promise<Cita[]> {
  const { data } = await api.get<Cita[]>("/citas", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString(), profesionalId },
  });
  return data;
}

export async function crearCita(payload: {
  pacienteId: string;
  profesionalId: string;
  tarifaId?: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  notas?: string;
}): Promise<Cita> {
  const { data } = await api.post<Cita>("/citas", payload);
  return data;
}

export async function crearCitasRecurrentes(payload: {
  pacienteId: string;
  profesionalId: string;
  tarifaId?: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  totalSesiones: number;
  diasSemana: number[];
  notas?: string;
}): Promise<Cita[]> {
  const { data } = await api.post<Cita[]>("/citas/recurrentes", payload);
  return data;
}

export async function actualizarCita(id: string, payload: Partial<Cita>): Promise<Cita> {
  const { data } = await api.put<Cita>(`/citas/${id}`, payload);
  return data;
}

export async function cancelarGrupoRecurrente(grupoRecurrenciaId: string) {
  const { data } = await api.post(`/citas/grupo/${grupoRecurrenciaId}/cancelar`);
  return data;
}

export async function listarBloqueos(desde: Date, hasta: Date, profesionalId?: string): Promise<BloqueoHorario[]> {
  const { data } = await api.get<BloqueoHorario[]>("/citas/bloqueos", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString(), profesionalId },
  });
  return data;
}

export async function crearBloqueo(payload: {
  profesionalId: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  motivo?: string;
}): Promise<BloqueoHorario> {
  const { data } = await api.post<BloqueoHorario>("/citas/bloqueos", payload);
  return data;
}

export async function eliminarBloqueo(id: string): Promise<void> {
  await api.delete(`/citas/bloqueos/${id}`);
}
