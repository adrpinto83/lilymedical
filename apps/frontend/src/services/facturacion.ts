import { api } from "./api";
import { Factura, Tarifa, Pago } from "../types";

export async function listarTarifas(): Promise<Tarifa[]> {
  const { data } = await api.get<Tarifa[]>("/facturacion/tarifas");
  return data;
}

export async function crearTarifa(payload: {
  nombreServicio: string;
  descripcion?: string;
  precio: number;
  aseguradoraId?: string;
}): Promise<Tarifa> {
  const { data } = await api.post<Tarifa>("/facturacion/tarifas", payload);
  return data;
}

export async function listarFacturas(pacienteId?: string, estado?: string): Promise<Factura[]> {
  const { data } = await api.get<Factura[]>("/facturacion/facturas", {
    params: { pacienteId, estado },
  });
  return data;
}

export async function obtenerFactura(id: string): Promise<Factura> {
  const { data } = await api.get<Factura>(`/facturacion/facturas/${id}`);
  return data;
}

export async function crearFactura(payload: {
  pacienteId: string;
  aseguradoraId?: string;
  impuestos?: number;
  notas?: string;
  detalles: { tarifaId: string; citaId?: string; sesionId?: string; cantidad?: number; descripcion?: string }[];
}): Promise<Factura> {
  const { data } = await api.post<Factura>("/facturacion/facturas", payload);
  return data;
}

export async function anularFactura(id: string): Promise<Factura> {
  const { data } = await api.post<Factura>(`/facturacion/facturas/${id}/anular`);
  return data;
}

export async function registrarPago(
  facturaId: string,
  payload: { monto: number; metodoPago: string; referencia?: string }
): Promise<Pago> {
  const { data } = await api.post<Pago>(`/facturacion/facturas/${facturaId}/pagos`, payload);
  return data;
}

export async function estadoDeCuenta(pacienteId: string) {
  const { data } = await api.get(`/facturacion/pacientes/${pacienteId}/estado-cuenta`);
  return data;
}
