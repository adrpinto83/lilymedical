import { api } from "./api";
import { Sesion } from "../types";

export async function crearSesion(payload: {
  pacienteId: string;
  citaId?: string;
  notaEvolucion: string;
  tratamientoAplicado?: string;
  asistencia?: "ASISTIO" | "INASISTIO" | "CANCELO";
}): Promise<Sesion> {
  const { data } = await api.post<Sesion>("/sesiones", payload);
  return data;
}
