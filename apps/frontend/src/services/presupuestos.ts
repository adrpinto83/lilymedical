import { api } from "./api";
import { verPdf } from "./pdf";
import { Presupuesto } from "../types";

export async function listarPresupuestos(filtros: { pacienteId?: string; q?: string } = {}): Promise<Presupuesto[]> {
  const { data } = await api.get<Presupuesto[]>("/presupuestos", { params: filtros });
  return data;
}

export async function crearPresupuesto(payload: {
  pacienteId: string;
  diagnostico?: string;
  tasaCambio?: number;
  notas?: string;
  items: { tarifaId?: string; descripcion: string; cantidad: number; precioUnitario: number }[];
}): Promise<Presupuesto> {
  const { data } = await api.post<Presupuesto>("/presupuestos", payload);
  return data;
}

export async function anularPresupuesto(id: string): Promise<Presupuesto> {
  const { data } = await api.post<Presupuesto>(`/presupuestos/${id}/anular`);
  return data;
}

export function abrirPdfPresupuesto(id: string): Promise<void> {
  return verPdf(`/presupuestos/${id}/pdf`, "presupuesto.pdf");
}
