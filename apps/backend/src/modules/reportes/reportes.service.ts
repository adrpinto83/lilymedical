import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

function inicioFin(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
}

const MESES_HISTORICO = 6;
const DIAS_AVISO_AUTORIZACION = 7;

function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

// Serie mensual completa (meses sin pagos incluidos en 0) desde `inicio`.
export function agruparIngresosPorMes(
  pagos: { fecha: Date; monto: Prisma.Decimal }[],
  inicio: Date,
  meses: number
): { mes: string; total: string }[] {
  const totales = new Map<string, Prisma.Decimal>();
  for (let i = 0; i < meses; i++) {
    totales.set(claveMes(new Date(inicio.getFullYear(), inicio.getMonth() + i, 1)), new Prisma.Decimal(0));
  }
  for (const p of pagos) {
    const clave = claveMes(p.fecha);
    const actual = totales.get(clave);
    if (actual) totales.set(clave, actual.add(p.monto));
  }
  return [...totales].map(([mes, total]) => ({ mes, total: total.toFixed(2) }));
}

function sumar(pagos: { monto: Prisma.Decimal }[]): Prisma.Decimal {
  return pagos.reduce((acc, p) => acc.add(p.monto), new Prisma.Decimal(0));
}

export async function obtenerDashboard() {
  const ahora = new Date();
  const { inicio: inicioHoy, fin: finHoy } = inicioFin(ahora);
  const { fin: finManana } = inicioFin(finHoy);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const inicioHistorico = new Date(ahora.getFullYear(), ahora.getMonth() - (MESES_HISTORICO - 1), 1);
  // "Mismo período" del mes anterior: del día 1 hasta el mismo punto del
  // mes, para comparar un mes en curso contra algo equivalente.
  const cortePeriodoAnterior = new Date(
    Math.min(inicioMesAnterior.getTime() + (ahora.getTime() - inicioMes.getTime()), inicioMes.getTime())
  );
  const limiteAutorizaciones = new Date(ahora.getTime() + DIAS_AVISO_AUTORIZACION * 24 * 60 * 60 * 1000);

  const [
    citasHoy,
    citasManana,
    pagosHistorico,
    pacientesActivos,
    pacientesNuevosDelMes,
    pacientesNuevosPeriodoAnterior,
    citasDelMesPorEstado,
    facturasPorCobrar,
    autorizacionesPendientes,
    autorizacionesPorVencer,
    cumpleanos,
  ] = await Promise.all([
    prisma.cita.findMany({
      where: { fechaHoraInicio: { gte: inicioHoy, lt: finHoy } },
      orderBy: { fechaHoraInicio: "asc" },
      include: {
        paciente: { select: { id: true, nombres: true, apellidos: true } },
        profesional: { select: { nombre: true, apellido: true } },
        tarifa: { select: { nombreServicio: true } },
      },
    }),
    prisma.cita.count({
      where: { fechaHoraInicio: { gte: finHoy, lt: finManana }, estado: { in: ["PROGRAMADA", "CONFIRMADA"] } },
    }),
    prisma.pago.findMany({
      where: { fecha: { gte: inicioHistorico, lt: finMes }, anulado: false },
      select: { fecha: true, monto: true },
    }),
    prisma.paciente.count({ where: { activo: true } }),
    prisma.paciente.count({ where: { createdAt: { gte: inicioMes, lt: finMes } } }),
    prisma.paciente.count({ where: { createdAt: { gte: inicioMesAnterior, lt: cortePeriodoAnterior } } }),
    prisma.cita.groupBy({
      by: ["estado"],
      where: { fechaHoraInicio: { gte: inicioMes, lt: ahora } },
      _count: { _all: true },
    }),
    prisma.factura.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
      select: { total: true, pagos: { where: { anulado: false }, select: { monto: true } } },
    }),
    prisma.autorizacionSeguro.count({ where: { estado: "PENDIENTE" } }),
    prisma.autorizacionSeguro.findMany({
      where: { estado: "APROBADA", vigenciaHasta: { gte: inicioHoy, lte: limiteAutorizaciones } },
      orderBy: { vigenciaHasta: "asc" },
      include: {
        paciente: { select: { id: true, nombres: true, apellidos: true } },
        aseguradora: { select: { nombre: true } },
      },
    }),
    // fechaNacimiento se guarda como medianoche UTC: se compara mes/día en UTC.
    prisma.$queryRaw<{ id: string; nombres: string; apellidos: string; fechaNacimiento: Date }[]>`
      SELECT id, nombres, apellidos, "fechaNacimiento" FROM pacientes
      WHERE activo = true
        AND EXTRACT(MONTH FROM "fechaNacimiento") = ${ahora.getMonth() + 1}
        AND EXTRACT(DAY FROM "fechaNacimiento") = ${ahora.getDate()}
      ORDER BY apellidos`,
  ]);

  const pagosDelMes = pagosHistorico.filter((p) => p.fecha >= inicioMes);
  const pagosPeriodoAnterior = pagosHistorico.filter(
    (p) => p.fecha >= inicioMesAnterior && p.fecha < cortePeriodoAnterior
  );

  const conteoEstados = Object.fromEntries(citasDelMesPorEstado.map((g) => [g.estado, g._count._all]));
  const atendidas = conteoEstados.ATENDIDA ?? 0;
  const inasistencias = conteoEstados.NO_ASISTIO ?? 0;

  const saldoPorCobrar = facturasPorCobrar.reduce(
    (acc, f) => acc.add(f.total.sub(sumar(f.pagos))),
    new Prisma.Decimal(0)
  );

  return {
    citasHoy,
    citasManana,
    ingresosDelMes: sumar(pagosDelMes).toFixed(2),
    ingresosPeriodoAnterior: sumar(pagosPeriodoAnterior).toFixed(2),
    ingresosPorMes: agruparIngresosPorMes(pagosHistorico, inicioHistorico, MESES_HISTORICO),
    pacientesActivos,
    pacientesNuevosDelMes,
    pacientesNuevosPeriodoAnterior,
    asistenciaDelMes: { atendidas, inasistencias },
    porCobrar: { facturas: facturasPorCobrar.length, saldo: saldoPorCobrar.toFixed(2) },
    autorizaciones: { pendientes: autorizacionesPendientes, porVencer: autorizacionesPorVencer },
    cumpleanos,
  };
}

export async function reporteIngresosPorPeriodo(desde: Date, hasta: Date) {
  const pagos = await prisma.pago.findMany({
    where: { fecha: { gte: desde, lte: hasta }, anulado: false },
    include: {
      factura: {
        select: {
          numeroFactura: true,
          pacienteId: true,
          paciente: { select: { nombres: true, apellidos: true, documento: true } },
        },
      },
    },
    orderBy: { fecha: "asc" },
  });

  const totalPorMetodo = pagos.reduce<Record<string, Prisma.Decimal>>((acc, p) => {
    acc[p.metodoPago] = (acc[p.metodoPago] ?? new Prisma.Decimal(0)).add(p.monto);
    return acc;
  }, {});

  const total = pagos.reduce((acc, p) => acc.add(p.monto), new Prisma.Decimal(0));

  return { pagos, totalPorMetodo, total };
}

export async function reportePacientesPorPeriodo(desde: Date, hasta: Date) {
  const pacientes = await prisma.paciente.findMany({
    where: { createdAt: { gte: desde, lte: hasta } },
    orderBy: { createdAt: "asc" },
  });
  return { total: pacientes.length, pacientes };
}

export async function reporteServiciosMasSolicitados(desde: Date, hasta: Date) {
  const detalles = await prisma.facturaDetalle.findMany({
    where: { factura: { fecha: { gte: desde, lte: hasta }, estado: { not: "ANULADA" } } },
    include: { tarifa: { select: { nombreServicio: true } } },
  });

  const conteo = new Map<string, { servicio: string; cantidad: number; total: Prisma.Decimal }>();
  for (const d of detalles) {
    const key = d.tarifaId;
    const actual = conteo.get(key) ?? {
      servicio: d.tarifa.nombreServicio,
      cantidad: 0,
      total: new Prisma.Decimal(0),
    };
    actual.cantidad += d.cantidad;
    actual.total = actual.total.add(d.subtotal);
    conteo.set(key, actual);
  }

  return Array.from(conteo.values()).sort((a, b) => b.cantidad - a.cantidad);
}

// Facturas cobradas (total o parcialmente) a una aseguradora en un período,
// con el split paciente/aseguradora congelado al emitirlas — insumo para el cobro/reclamo
// que se envía al convenio (PDVSA-HCM, Sicoprosa, etc.).
export async function reporteCobrosAseguradora(desde: Date, hasta: Date, aseguradoraId?: string) {
  const facturas = await prisma.factura.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
      estado: { not: "ANULADA" },
      aseguradoraId: aseguradoraId ?? { not: null },
    },
    include: {
      paciente: { select: { nombres: true, apellidos: true, documento: true } },
      aseguradora: true,
      autorizacion: { select: { numeroAutorizacion: true } },
      pagos: { where: { anulado: false }, select: { monto: true } },
    },
    orderBy: [{ aseguradoraId: "asc" }, { fecha: "asc" }],
  });

  return facturas;
}

// Facturas con saldo (pendientes o parciales), de la más antigua a la más nueva.
export async function facturasConSaldo() {
  return prisma.factura.findMany({
    where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
    include: {
      paciente: { select: { nombres: true, apellidos: true, documento: true, telefono: true } },
      aseguradora: { select: { nombre: true } },
      pagos: { where: { anulado: false }, select: { monto: true } },
    },
    orderBy: { fecha: "asc" },
  });
}
