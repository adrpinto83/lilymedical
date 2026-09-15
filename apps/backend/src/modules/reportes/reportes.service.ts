import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

function inicioFin(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
}

export async function obtenerDashboard() {
  const hoy = new Date();
  const { inicio: inicioHoy, fin: finHoy } = inicioFin(hoy);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);

  const [citasHoy, pagosDelMes, pacientesActivos, pacientesNuevosDelMes] = await Promise.all([
    prisma.cita.findMany({
      where: { fechaHoraInicio: { gte: inicioHoy, lt: finHoy } },
      orderBy: { fechaHoraInicio: "asc" },
      include: {
        paciente: { select: { nombres: true, apellidos: true } },
        profesional: { select: { nombre: true, apellido: true } },
      },
    }),
    prisma.pago.findMany({ where: { fecha: { gte: inicioMes, lt: finMes } } }),
    prisma.paciente.count({ where: { activo: true } }),
    prisma.paciente.count({ where: { createdAt: { gte: inicioMes, lt: finMes } } }),
  ]);

  const ingresosDelMes = pagosDelMes.reduce(
    (acc, p) => acc.add(p.monto),
    new Prisma.Decimal(0)
  );

  return {
    citasHoy,
    ingresosDelMes,
    pacientesActivos,
    pacientesNuevosDelMes,
  };
}

export async function reporteIngresosPorPeriodo(desde: Date, hasta: Date) {
  const pagos = await prisma.pago.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    include: { factura: { select: { numeroFactura: true, pacienteId: true } } },
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
