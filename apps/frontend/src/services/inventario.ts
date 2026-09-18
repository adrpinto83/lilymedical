import { api } from "./api";

export interface Insumo {
  id: string;
  nombre: string;
  categoria: string | null;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string | null;
}

export interface MovimientoInsumo {
  id: string;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number;
  motivo: string | null;
  fecha: string;
  registradoPor: { nombre: string; apellido: string };
}

export interface InsumoPayload {
  nombre: string;
  categoria?: string | null;
  stockMinimo: number;
  unidadMedida?: string | null;
}

export async function listarInsumos(): Promise<Insumo[]> {
  const { data } = await api.get<Insumo[]>("/inventario");
  return data;
}

export async function listarInsumosBajoStock(): Promise<Insumo[]> {
  const { data } = await api.get<Insumo[]>("/inventario/bajo-stock");
  return data;
}

export async function crearInsumo(payload: InsumoPayload & { stockInicial: number }): Promise<Insumo> {
  const { data } = await api.post<Insumo>("/inventario", payload);
  return data;
}

export async function actualizarInsumo(id: string, payload: InsumoPayload): Promise<Insumo> {
  const { data } = await api.put<Insumo>(`/inventario/${id}`, payload);
  return data;
}

export async function desactivarInsumo(id: string): Promise<void> {
  await api.delete(`/inventario/${id}`);
}

export async function listarMovimientos(id: string): Promise<MovimientoInsumo[]> {
  const { data } = await api.get<MovimientoInsumo[]>(`/inventario/${id}/movimientos`);
  return data;
}

export async function registrarMovimiento(
  id: string,
  payload: { tipo: "ENTRADA" | "SALIDA"; cantidad: number; motivo?: string }
): Promise<void> {
  await api.post(`/inventario/${id}/movimientos`, payload);
}
