import { api } from "./api";

export interface DashboardData {
  citasHoy: Array<{
    id: string;
    fechaHoraInicio: string;
    estado: string;
    paciente: { nombres: string; apellidos: string };
    profesional: { nombre: string; apellido: string };
  }>;
  ingresosDelMes: string;
  pacientesActivos: number;
  pacientesNuevosDelMes: number;
}

export async function obtenerDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>("/reportes/dashboard");
  return data;
}

export async function reporteIngresos(desde: Date, hasta: Date) {
  const { data } = await api.get("/reportes/ingresos", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString() },
  });
  return data;
}

export async function reportePacientesNuevos(desde: Date, hasta: Date) {
  const { data } = await api.get("/reportes/pacientes-nuevos", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString() },
  });
  return data;
}

export async function reporteServiciosMasSolicitados(desde: Date, hasta: Date) {
  const { data } = await api.get("/reportes/servicios-mas-solicitados", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString() },
  });
  return data;
}

export function urlExportIngresosCsv(desde: Date, hasta: Date) {
  const params = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() });
  return `/api/reportes/ingresos.csv?${params.toString()}`;
}
