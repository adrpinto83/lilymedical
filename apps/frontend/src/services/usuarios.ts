import { api } from "./api";

export interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  especialidad?: string | null;
}

export async function listarProfesionales(): Promise<Profesional[]> {
  const { data } = await api.get<Profesional[]>("/usuarios/profesionales");
  return data;
}
