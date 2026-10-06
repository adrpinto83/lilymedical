import { api } from "./api";
import { verPdf } from "./pdf";
import { Factura, Tarifa, Pago } from "../types";

export async function listarTarifas(incluirInactivas = false): Promise<Tarifa[]> {
  const { data } = await api.get<Tarifa[]>("/facturacion/tarifas", {
    params: incluirInactivas ? { incluirInactivas: "true" } : undefined,
  });
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

export async function actualizarTarifa(
  id: string,
  payload: { nombreServicio?: string; precio?: number; descripcion?: string | null; activo?: boolean }
): Promise<Tarifa> {
  const { data } = await api.put<Tarifa>(`/facturacion/tarifas/${id}`, payload);
  return data;
}

export async function desactivarTarifa(id: string): Promise<void> {
  await api.delete(`/facturacion/tarifas/${id}`);
}

export interface FiltrosFacturas {
  pacienteId?: string;
  /** Un estado o "CON_SALDO" (pendientes y parciales). */
  estado?: string;
  desde?: string;
  hasta?: string;
  q?: string;
}

export async function listarFacturas(filtros: FiltrosFacturas = {}): Promise<Factura[]> {
  const { data } = await api.get<Factura[]>("/facturacion/facturas", { params: filtros });
  return data;
}

export interface CitaPorFacturar {
  id: string;
  fechaHoraInicio: string;
  numeroSesionEnGrupo?: number | null;
  totalSesionesGrupo?: number | null;
  tarifa?: Tarifa | null;
  profesional?: { nombre: string; apellido: string };
}

export async function listarCitasPorFacturar(pacienteId: string): Promise<CitaPorFacturar[]> {
  const { data } = await api.get<CitaPorFacturar[]>(`/facturacion/pacientes/${pacienteId}/citas-por-facturar`);
  return data;
}

export async function obtenerFactura(id: string): Promise<Factura> {
  const { data } = await api.get<Factura>(`/facturacion/facturas/${id}`);
  return data;
}

export async function crearFactura(payload: {
  pacienteId: string;
  aseguradoraId?: string;
  autorizacionId?: string;
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
  payload: { monto?: number; metodoPago: string; referencia?: string; montoBs?: number; tasaCambio?: number }
): Promise<Pago> {
  const { data } = await api.post<Pago>(`/facturacion/facturas/${facturaId}/pagos`, payload);
  return data;
}

export async function anularPago(facturaId: string, pagoId: string, motivo: string): Promise<Pago> {
  const { data } = await api.post<Pago>(`/facturacion/facturas/${facturaId}/pagos/${pagoId}/anular`, { motivo });
  return data;
}

// Igual que las recetas: el PDF exige el token, así que se baja como blob.
export function abrirPdfFactura(id: string): Promise<void> {
  return verPdf(`/facturacion/facturas/${id}/pdf`);
}

export async function estadoDeCuenta(pacienteId: string) {
  const { data } = await api.get(`/facturacion/pacientes/${pacienteId}/estado-cuenta`);
  return data;
}
