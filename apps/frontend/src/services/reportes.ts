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

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

// Usa un blob autenticado en vez de un <a href> directo: el endpoint exige
// el header Authorization, que un link plano no puede enviar.
export async function descargarIngresosCsv(desde: Date, hasta: Date) {
  const { data } = await api.get("/reportes/ingresos.csv", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString() },
    responseType: "blob",
  });
  descargarBlob(new Blob([data], { type: "text/csv" }), "ingresos.csv");
}

export async function reporteCobrosAseguradora(desde: Date, hasta: Date, aseguradoraId?: string) {
  const { data } = await api.get("/reportes/cobros-aseguradora", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString(), aseguradoraId },
  });
  return data;
}

export async function descargarCobrosAseguradoraCsv(desde: Date, hasta: Date, aseguradoraId?: string) {
  const { data } = await api.get("/reportes/cobros-aseguradora.csv", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString(), aseguradoraId },
    responseType: "blob",
  });
  descargarBlob(new Blob([data], { type: "text/csv" }), "cobros-aseguradora.csv");
}
