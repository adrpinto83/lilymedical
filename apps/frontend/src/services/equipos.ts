import { api } from "./api";

export type EstadoEquipo = "OPERATIVO" | "EN_MANTENIMIENTO" | "FUERA_DE_SERVICIO" | "DADO_DE_BAJA";
export type TipoMantenimiento = "PREVENTIVO" | "CORRECTIVO" | "CALIBRACION";

export interface Equipo {
  id: string;
  nombre: string;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  ubicacion: string | null;
  fechaAdquisicion: string | null;
  garantiaHasta: string | null;
  proveedorServicio: string | null;
  estado: EstadoEquipo;
  frecuenciaMantenimientoDias: number | null;
  ultimoMantenimiento: string | null;
  proximoMantenimiento: string | null;
  notas: string | null;
  activo: boolean;
}

export interface MantenimientoEquipo {
  id: string;
  tipo: TipoMantenimiento;
  fecha: string;
  descripcion: string;
  realizadoPor: string | null;
  costo: string | null;
  registradoPor: { nombre: string; apellido: string };
}

export interface EquipoDetalle extends Equipo {
  mantenimientos: MantenimientoEquipo[];
}

export interface AlertasEquipos {
  diasAviso: number;
  mantenimientoVencido: Equipo[];
  mantenimientoProximo: Equipo[];
  fueraDeServicio: Equipo[];
}

export type EquipoPayload = Partial<Omit<Equipo, "id" | "activo">> & { nombre: string };

export interface MantenimientoPayload {
  tipo: TipoMantenimiento;
  fecha: string;
  descripcion: string;
  realizadoPor?: string;
  costo?: number;
  estadoResultante: EstadoEquipo;
}

export async function listarEquipos(incluirBajas = false): Promise<Equipo[]> {
  const { data } = await api.get<Equipo[]>("/equipos", { params: { incluirBajas } });
  return data;
}

export async function obtenerEquipo(id: string): Promise<EquipoDetalle> {
  const { data } = await api.get<EquipoDetalle>(`/equipos/${id}`);
  return data;
}

export async function crearEquipo(payload: EquipoPayload): Promise<Equipo> {
  const { data } = await api.post<Equipo>("/equipos", payload);
  return data;
}

export async function actualizarEquipo(id: string, payload: EquipoPayload): Promise<Equipo> {
  const { data } = await api.put<Equipo>(`/equipos/${id}`, payload);
  return data;
}

export async function darDeBajaEquipo(id: string): Promise<void> {
  await api.delete(`/equipos/${id}`);
}

export async function registrarMantenimiento(id: string, payload: MantenimientoPayload): Promise<void> {
  await api.post(`/equipos/${id}/mantenimientos`, payload);
}

export async function obtenerAlertasEquipos(): Promise<AlertasEquipos> {
  const { data } = await api.get<AlertasEquipos>("/equipos/alertas");
  return data;
}
