import { api } from "./api";
import { Aseguradora } from "../types";

export async function listarAseguradoras(): Promise<Aseguradora[]> {
  const { data } = await api.get<Aseguradora[]>("/aseguradoras");
  return data;
}

export async function crearAseguradora(payload: Partial<Aseguradora>): Promise<Aseguradora> {
  const { data } = await api.post<Aseguradora>("/aseguradoras", payload);
  return data;
}

export async function actualizarAseguradora(
  id: string,
  payload: Partial<Aseguradora>
): Promise<Aseguradora> {
  const { data } = await api.put<Aseguradora>(`/aseguradoras/${id}`, payload);
  return data;
}

export async function eliminarAseguradora(id: string): Promise<void> {
  await api.delete(`/aseguradoras/${id}`);
}
