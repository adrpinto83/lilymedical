import { EstadoCita, MetodoPago, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// Reporte consolidado de un período: finanzas, cuentas por cobrar, agenda,
// pacientes, servicios y (solo para el médico) indicadores de fisiatría.
// Las fechas se agrupan en la hora local del servidor (Venezuela, -04).

const CERO = new Prisma.Decimal(0);
const DIA_MS = 24 * 60 * 60 * 1000;

const sumar = <T>(items: T[], valor: (i: T) => Prisma.Decimal | null | undefined) =>
  items.reduce((acc, i) => acc.add(valor(i) ?? CERO), CERO);

export function claveDia(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

/**
 * Serie de ingresos: por día si el período es de hasta 62 días, si no por
 * mes. Incluye en 0 los días/meses sin cobros para que la gráfica no mienta.
 */
export function serieIngresos(pagos: { fecha: Date; monto: Prisma.Decimal }[], desde: Date, hasta: Date) {
  const porDia = hasta.getTime() - desde.getTime() <= 62 * DIA_MS;
  const clave = (f: Date) => (porDia ? claveDia(f) : claveDia(f).slice(0, 7));
  const totales = new Map<string, Prisma.Decimal>();
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), porDia ? desde.getDate() : 1);
  while (cursor <= hasta) {
    totales.set(clave(cursor), CERO);
    if (porDia) cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const p of pagos) {
    const k = clave(p.fecha);
    if (totales.has(k)) totales.set(k, totales.get(k)!.add(p.monto));
  }
  return {
    granularidad: porDia ? ("dia" as const) : ("mes" as const),
    puntos: [...totales].map(([fecha, total]) => ({ fecha, total: total.toFixed(2) })),
  };
}

export const TRAMOS_ANTIGUEDAD = [
  { etiqueta: "0-30 días", hasta: 30 },
  { etiqueta: "31-60 días", hasta: 60 },
  { etiqueta: "61-90 días", hasta: 90 },
  { etiqueta: "Más de 90 días", hasta: Infinity },
];

/**
 * Reparte el saldo de una factura entre aseguradora y paciente. Los pagos no
 * registran quién pagó, así que se asume (como en la pantalla de cobro) que
 * primero se cubre la parte del paciente.
 */
export function repartirSaldo(f: {
  total: Prisma.Decimal;
  montoAseguradora: Prisma.Decimal | null;
  pagado: Prisma.Decimal;
}) {
  const saldo = f.total.sub(f.pagado);
  if (f.montoAseguradora === null) return { saldo, aseguradora: CERO, paciente: saldo };
  const aseguradora = Prisma.Decimal.min(saldo, f.montoAseguradora);
  return { saldo, aseguradora, paciente: saldo.sub(aseguradora) };
}

async function kpis(desde: Date, hasta: Date) {
  const [cobrado, facturado, atendidas, pacientesNuevos] = await Promise.all([
    prisma.pago.aggregate({ _sum: { monto: true }, where: { fecha: { gte: desde, lte: hasta }, anulado: false } }),
    prisma.factura.aggregate({
      _sum: { total: true },
      where: { fecha: { gte: desde, lte: hasta }, estado: { not: "ANULADA" } },
    }),
    prisma.cita.count({ where: { fechaHoraInicio: { gte: desde, lte: hasta }, estado: "ATENDIDA" } }),
    prisma.paciente.count({ where: { createdAt: { gte: desde, lte: hasta } } }),
  ]);
  return {
    cobrado: (cobrado._sum.monto ?? CERO).toFixed(2),
    facturado: (facturado._sum.total ?? CERO).toFixed(2),
    citasAtendidas: atendidas,
    pacientesNuevos,
  };
}

export async function resumenPeriodo(desde: Date, hasta: Date, incluirClinico: boolean) {
  // Período anterior de la misma duración, para comparar.
  const duracion = hasta.getTime() - desde.getTime();
  const anteriorHasta = new Date(desde.getTime() - 1);
  const anteriorDesde = new Date(anteriorHasta.getTime() - duracion);

  const [actual, anterior, pagos, facturas, facturasConSaldo, citas, sesiones, servicios] = await Promise.all([
    kpis(desde, hasta),
    kpis(anteriorDesde, anteriorHasta),
    prisma.pago.findMany({
      where: { fecha: { gte: desde, lte: hasta }, anulado: false },
      select: { fecha: true, monto: true, metodoPago: true, montoBs: true },
    }),
    prisma.factura.findMany({
      where: { fecha: { gte: desde, lte: hasta }, estado: { not: "ANULADA" } },
      select: { total: true, montoAseguradora: true, montoPaciente: true, pacienteId: true, aseguradoraId: true },
    }),
    // Cuentas por cobrar: a la fecha de hoy, sin importar el período.
    prisma.factura.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] } },
      select: {
        fecha: true,
        total: true,
        montoAseguradora: true,
        aseguradora: { select: { id: true, nombre: true } },
        pagos: { where: { anulado: false }, select: { monto: true } },
      },
    }),
    prisma.cita.findMany({
      where: { fechaHoraInicio: { gte: desde, lte: hasta } },
      select: {
        estado: true,
        pacienteId: true,
        profesional: { select: { id: true, nombre: true, apellido: true } },
      },
    }),
    incluirClinico
      ? prisma.sesion.findMany({
          where: { fecha: { gte: desde, lte: hasta }, asistencia: "ASISTIO" },
          select: { evaPre: true, evaPost: true, modalidades: true },
        })
      : Promise.resolve([]),
    prisma.facturaDetalle.findMany({
      where: { factura: { fecha: { gte: desde, lte: hasta }, estado: { not: "ANULADA" } } },
      select: { cantidad: true, subtotal: true, tarifa: { select: { id: true, nombreServicio: true } } },
    }),
  ]);

  // --- Cobros por método (con lo recibido en bolívares)
  const porMetodo = new Map<MetodoPago, { total: Prisma.Decimal; totalBs: Prisma.Decimal; cantidad: number }>();
  for (const p of pagos) {
    const m = porMetodo.get(p.metodoPago) ?? { total: CERO, totalBs: CERO, cantidad: 0 };
    porMetodo.set(p.metodoPago, {
      total: m.total.add(p.monto),
      totalBs: m.totalBs.add(p.montoBs ?? CERO),
      cantidad: m.cantidad + 1,
    });
  }

  // --- Cuentas por cobrar por antigüedad y por aseguradora
  const hoy = Date.now();
  const tramos = TRAMOS_ANTIGUEDAD.map((t) => ({ etiqueta: t.etiqueta, saldo: CERO, facturas: 0 }));
  const porAseguradora = new Map<string, { nombre: string; saldo: Prisma.Decimal; facturas: number }>();
  let pendientePacientes = CERO;
  let pendienteAseguradoras = CERO;
  for (const f of facturasConSaldo) {
    const { saldo, aseguradora, paciente } = repartirSaldo({ ...f, pagado: sumar(f.pagos, (p) => p.monto) });
    if (saldo.lte(0)) continue;
    const dias = Math.floor((hoy - f.fecha.getTime()) / DIA_MS);
    const tramo = tramos[TRAMOS_ANTIGUEDAD.findIndex((t) => dias <= t.hasta)];
    tramo.saldo = tramo.saldo.add(saldo);
    tramo.facturas++;
    pendientePacientes = pendientePacientes.add(paciente);
    pendienteAseguradoras = pendienteAseguradoras.add(aseguradora);
    if (f.aseguradora && aseguradora.gt(0)) {
      const a = porAseguradora.get(f.aseguradora.id) ?? { nombre: f.aseguradora.nombre, saldo: CERO, facturas: 0 };
      porAseguradora.set(f.aseguradora.id, { ...a, saldo: a.saldo.add(aseguradora), facturas: a.facturas + 1 });
    }
  }

  // --- Agenda
  const estados: Record<EstadoCita, number> = { PROGRAMADA: 0, CONFIRMADA: 0, ATENDIDA: 0, CANCELADA: 0, NO_ASISTIO: 0 };
  const porProfesional = new Map<string, { nombre: string; atendidas: number; noAsistio: number; canceladas: number; total: number }>();
  for (const c of citas) {
    estados[c.estado]++;
    const p = porProfesional.get(c.profesional.id) ?? {
      nombre: `${c.profesional.nombre} ${c.profesional.apellido}`,
      atendidas: 0,
      noAsistio: 0,
      canceladas: 0,
      total: 0,
    };
    p.total++;
    if (c.estado === "ATENDIDA") p.atendidas++;
    if (c.estado === "NO_ASISTIO") p.noAsistio++;
    if (c.estado === "CANCELADA") p.canceladas++;
    porProfesional.set(c.profesional.id, p);
  }
  // Asistencia sobre las citas que ya se resolvieron (atendida o no asistió).
  const resueltas = estados.ATENDIDA + estados.NO_ASISTIO;
  const pacientesAtendidos = new Set(citas.filter((c) => c.estado === "ATENDIDA").map((c) => c.pacienteId)).size;

  // --- Servicios
  const porServicio = new Map<string, { servicio: string; cantidad: number; total: Prisma.Decimal }>();
  for (const d of servicios) {
    const s = porServicio.get(d.tarifa.id) ?? { servicio: d.tarifa.nombreServicio, cantidad: 0, total: CERO };
    porServicio.set(d.tarifa.id, { ...s, cantidad: s.cantidad + d.cantidad, total: s.total.add(d.subtotal) });
  }

  // --- Fisiatría (solo médico): alivio del dolor y modalidades usadas
  let clinico = null;
  if (incluirClinico) {
    const conEva = sesiones.filter((s) => s.evaPre !== null && s.evaPost !== null);
    const modalidades = new Map<string, number>();
    for (const s of sesiones) for (const m of s.modalidades) modalidades.set(m, (modalidades.get(m) ?? 0) + 1);
    clinico = {
      sesiones: sesiones.length,
      sesionesConEva: conEva.length,
      evaPrePromedio: conEva.length ? conEva.reduce((a, s) => a + s.evaPre!, 0) / conEva.length : null,
      evaPostPromedio: conEva.length ? conEva.reduce((a, s) => a + s.evaPost!, 0) / conEva.length : null,
      sesionesConAlivio: conEva.filter((s) => s.evaPost! < s.evaPre!).length,
      modalidades: [...modalidades]
        .map(([nombre, veces]) => ({ nombre, veces }))
        .sort((a, b) => b.veces - a.veces)
        .slice(0, 10),
    };
  }

  const facturado = sumar(facturas, (f) => f.total);
  return {
    periodo: { desde, hasta, anteriorDesde, anteriorHasta },
    actual,
    anterior,
    finanzas: {
      facturas: facturas.length,
      facturado: facturado.toFixed(2),
      facturadoAseguradoras: sumar(facturas, (f) => f.montoAseguradora).toFixed(2),
      facturadoParticular: sumar(facturas, (f) => (f.aseguradoraId ? CERO : f.total)).toFixed(2),
      ticketPromedio: facturas.length ? facturado.div(facturas.length).toFixed(2) : "0.00",
      cobrado: sumar(pagos, (p) => p.monto).toFixed(2),
      recibidoEnBs: sumar(pagos, (p) => p.montoBs).toFixed(2),
      serie: serieIngresos(pagos, desde, hasta),
      porMetodo: [...porMetodo]
        .map(([metodo, v]) => ({ metodo, total: v.total.toFixed(2), totalBs: v.totalBs.toFixed(2), cantidad: v.cantidad }))
        .sort((a, b) => Number(b.total) - Number(a.total)),
    },
    porCobrar: {
      total: pendientePacientes.add(pendienteAseguradoras).toFixed(2),
      pacientes: pendientePacientes.toFixed(2),
      aseguradoras: pendienteAseguradoras.toFixed(2),
      antiguedad: tramos.map((t) => ({ ...t, saldo: t.saldo.toFixed(2) })),
      porAseguradora: [...porAseguradora.values()]
        .map((a) => ({ ...a, saldo: a.saldo.toFixed(2) }))
        .sort((a, b) => Number(b.saldo) - Number(a.saldo)),
    },
    agenda: {
      total: citas.length,
      estados,
      tasaAsistencia: resueltas ? Math.round((estados.ATENDIDA / resueltas) * 100) : null,
      pacientesAtendidos,
      porProfesional: [...porProfesional.values()].sort((a, b) => b.atendidas - a.atendidas),
    },
    servicios: [...porServicio.values()]
      .map((s) => ({ ...s, total: s.total.toFixed(2) }))
      .sort((a, b) => b.cantidad - a.cantidad),
    clinico,
  };
}

export type ResumenPeriodo = Awaited<ReturnType<typeof resumenPeriodo>>;
