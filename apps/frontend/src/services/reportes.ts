import { api } from "./api";
import type { EstadoCita } from "../types";

export interface DashboardData {
  citasHoy: Array<{
    id: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    estado: EstadoCita;
    numeroSesionEnGrupo: number | null;
    totalSesionesGrupo: number | null;
    paciente: { id: string; nombres: string; apellidos: string };
    profesional: { nombre: string; apellido: string };
    tarifa: { nombreServicio: string } | null;
  }>;
  citasManana: number;
  ingresosDelMes: string;
  ingresosPeriodoAnterior: string;
  ingresosPorMes: { mes: string; total: string }[];
  pacientesActivos: number;
  pacientesNuevosDelMes: number;
  pacientesNuevosPeriodoAnterior: number;
  asistenciaDelMes: { atendidas: number; inasistencias: number };
  porCobrar: { facturas: number; saldo: string };
  autorizaciones: {
    pendientes: number;
    porVencer: Array<{
      id: string;
      vigenciaHasta: string;
      sesionesAutorizadas: number | null;
      paciente: { id: string; nombres: string; apellidos: string };
      aseguradora: { nombre: string };
    }>;
  };
  cumpleanos: Array<{ id: string; nombres: string; apellidos: string; fechaNacimiento: string }>;
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

const fechaArchivo = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sufijoArchivo = (desde: Date, hasta: Date) => `${fechaArchivo(desde)}_a_${fechaArchivo(hasta)}`;

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
  descargarBlob(new Blob([data], { type: "text/csv" }), `ingresos_${sufijoArchivo(desde, hasta)}.csv`);
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
  descargarBlob(new Blob([data], { type: "text/csv" }), `cobros-aseguradoras_${sufijoArchivo(desde, hasta)}.csv`);
}

export interface ResumenReporte {
  periodo: { desde: string; hasta: string; anteriorDesde: string; anteriorHasta: string };
  actual: KpisReporte;
  anterior: KpisReporte;
  finanzas: {
    facturas: number;
    facturado: string;
    facturadoAseguradoras: string;
    facturadoParticular: string;
    ticketPromedio: string;
    cobrado: string;
    recibidoEnBs: string;
    serie: { granularidad: "dia" | "mes"; puntos: { fecha: string; total: string }[] };
    porMetodo: { metodo: string; total: string; totalBs: string; cantidad: number }[];
  };
  porCobrar: {
    total: string;
    pacientes: string;
    aseguradoras: string;
    antiguedad: { etiqueta: string; saldo: string; facturas: number }[];
    porAseguradora: { nombre: string; saldo: string; facturas: number }[];
  };
  agenda: {
    total: number;
    estados: Record<EstadoCita, number>;
    tasaAsistencia: number | null;
    pacientesAtendidos: number;
    porProfesional: { nombre: string; atendidas: number; noAsistio: number; canceladas: number; total: number }[];
  };
  servicios: { servicio: string; cantidad: number; total: string }[];
  clinico: {
    sesiones: number;
    sesionesConEva: number;
    evaPrePromedio: number | null;
    evaPostPromedio: number | null;
    sesionesConAlivio: number;
    modalidades: { nombre: string; veces: number }[];
  } | null;
}

export interface KpisReporte {
  cobrado: string;
  facturado: string;
  citasAtendidas: number;
  pacientesNuevos: number;
}

export async function obtenerResumen(desde: Date, hasta: Date): Promise<ResumenReporte> {
  const { data } = await api.get<ResumenReporte>("/reportes/resumen", {
    params: { desde: desde.toISOString(), hasta: hasta.toISOString() },
  });
  return data;
}

export async function descargarCuentasPorCobrarCsv() {
  const { data } = await api.get("/reportes/cuentas-por-cobrar.csv", { responseType: "blob" });
  descargarBlob(new Blob([data], { type: "text/csv" }), "cuentas-por-cobrar.csv");
}
