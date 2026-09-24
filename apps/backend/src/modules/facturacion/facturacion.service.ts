import { EstadoFactura, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { siguienteNumero } from "../../lib/correlativos";
import {
  AnularPagoInput,
  CrearFacturaInput,
  RegistrarPagoInput,
  TarifaInput,
} from "./facturacion.schema";

const CERO = new Prisma.Decimal(0);

// ---------- Tarifas ----------

export async function listarTarifas() {
  return prisma.tarifa.findMany({ where: { activo: true }, orderBy: { nombreServicio: "asc" } });
}

export async function crearTarifa(data: TarifaInput) {
  return prisma.tarifa.create({ data });
}

export async function actualizarTarifa(id: string, data: Partial<TarifaInput>) {
  return prisma.tarifa.update({ where: { id }, data });
}

export async function desactivarTarifa(id: string) {
  return prisma.tarifa.update({ where: { id }, data: { activo: false } });
}

// ---------- Reglas de cobro ----------

// Reparto aseguradora/paciente de una factura. Sin % configurado la
// aseguradora cubre el 100%; en ambos casos nunca paga más que su tope por
// sesión multiplicado por las unidades facturadas. Se calcula una sola vez
// al emitir la factura y queda guardado en ella.
export function calcularSplitFactura(
  total: Prisma.Decimal,
  aseguradora: {
    porcentajeCobertura: number | null;
    topeMontoPorSesion: Prisma.Decimal | null;
  } | null,
  unidades: number
): { montoAseguradora: Prisma.Decimal | null; montoPaciente: Prisma.Decimal } {
  if (!aseguradora) return { montoAseguradora: null, montoPaciente: total };

  let montoAseguradora =
    aseguradora.porcentajeCobertura === null
      ? total
      : total.mul(aseguradora.porcentajeCobertura).div(100).toDecimalPlaces(2);

  if (aseguradora.topeMontoPorSesion !== null) {
    const tope = aseguradora.topeMontoPorSesion.mul(unidades);
    if (montoAseguradora.gt(tope)) montoAseguradora = tope;
  }

  return { montoAseguradora, montoPaciente: total.sub(montoAseguradora) };
}

export function estadoSegunPagos(total: Prisma.Decimal, pagado: Prisma.Decimal): EstadoFactura {
  if (pagado.gte(total)) return "PAGADA";
  if (pagado.gt(0)) return "PARCIAL";
  return "PENDIENTE";
}

function sumarPagosActivos(pagos: { monto: Prisma.Decimal; anulado: boolean }[]) {
  return pagos.filter((p) => !p.anulado).reduce((acc, p) => acc.add(p.monto), CERO);
}

type AutorizacionConFacturas = {
  sesionesAutorizadas: number | null;
  facturas: { detalles: { cantidad: number }[] }[];
};

// Unidades ya facturadas contra una autorización (facturas no anuladas).
export function sesionesUsadas(autorizacion: AutorizacionConFacturas): number {
  return autorizacion.facturas.reduce(
    (acc, f) => acc + f.detalles.reduce((s, d) => s + d.cantidad, 0),
    0
  );
}

export const includeConsumoAutorizacion = {
  facturas: {
    where: { estado: { not: "ANULADA" } },
    select: { detalles: { select: { cantidad: true } } },
  },
} as const;

function inicioDelDia(fecha = new Date()) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// Elige la autorización aprobada y vigente con cupo para las unidades a
// facturar (la que vence primero). Bloquea las autorizaciones del paciente
// con esa aseguradora hasta el fin de la transacción, para que dos facturas
// simultáneas no consuman el mismo cupo.
async function resolverAutorizacion(
  tx: Prisma.TransactionClient,
  pacienteId: string,
  aseguradoraId: string,
  unidades: number,
  autorizacionId?: string
) {
  await tx.$queryRaw`
    SELECT id FROM autorizaciones_seguro
    WHERE "pacienteId" = ${pacienteId} AND "aseguradoraId" = ${aseguradoraId}
    FOR UPDATE`;

  const candidatas = await tx.autorizacionSeguro.findMany({
    where: {
      pacienteId,
      aseguradoraId,
      id: autorizacionId,
      estado: "APROBADA",
      OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: inicioDelDia() } }],
    },
    include: includeConsumoAutorizacion,
    orderBy: [{ vigenciaHasta: { sort: "asc", nulls: "last" } }, { fechaSolicitud: "asc" }],
  });

  if (candidatas.length === 0) {
    throw new HttpError(
      400,
      autorizacionId
        ? "La autorización indicada no existe, no está aprobada o ya venció"
        : "Esta aseguradora exige una autorización previa aprobada y vigente para el paciente"
    );
  }

  const conCupo = candidatas.find(
    (a) => a.sesionesAutorizadas === null || a.sesionesAutorizadas - sesionesUsadas(a) >= unidades
  );
  if (!conCupo) {
    const restantes = candidatas.map((a) => (a.sesionesAutorizadas ?? 0) - sesionesUsadas(a));
    throw new HttpError(
      400,
      `La autorización no tiene sesiones suficientes: quedan ${Math.max(...restantes, 0)} y se intentan facturar ${unidades}`
    );
  }
  return conCupo;
}

// ---------- Facturas ----------

export async function crearFactura(data: CrearFacturaInput) {
  return prisma.$transaction(async (tx) => {
    const paciente = await tx.paciente.findUnique({ where: { id: data.pacienteId } });
    if (!paciente) throw new HttpError(404, "Paciente no encontrado");
    if (!paciente.activo) throw new HttpError(400, "El paciente está inactivo");

    const tarifas = await tx.tarifa.findMany({
      where: { id: { in: data.detalles.map((d) => d.tarifaId) } },
    });
    const tarifaMap = new Map(tarifas.map((t) => [t.id, t]));

    let subtotal = CERO;
    let unidades = 0;
    const detallesConPrecio = data.detalles.map((d) => {
      const tarifa = tarifaMap.get(d.tarifaId);
      if (!tarifa) throw new HttpError(400, `Tarifa ${d.tarifaId} no existe`);
      if (!tarifa.activo) {
        throw new HttpError(400, `La tarifa "${tarifa.nombreServicio}" está desactivada`);
      }
      const detalleSubtotal = tarifa.precio.mul(d.cantidad);
      subtotal = subtotal.add(detalleSubtotal);
      unidades += d.cantidad;
      return {
        tarifaId: d.tarifaId,
        citaId: d.citaId,
        sesionId: d.sesionId,
        descripcion: d.descripcion ?? tarifa.nombreServicio,
        cantidad: d.cantidad,
        precioUnitario: tarifa.precio,
        subtotal: detalleSubtotal,
      };
    });

    const impuestos = new Prisma.Decimal(data.impuestos);
    const total = subtotal.add(impuestos);

    let aseguradora = null;
    let autorizacionId: string | undefined;
    if (data.aseguradoraId) {
      aseguradora = await tx.aseguradora.findUnique({ where: { id: data.aseguradoraId } });
      if (!aseguradora || !aseguradora.activo) {
        throw new HttpError(400, "La aseguradora no existe o está inactiva");
      }
      const afiliacion = await tx.pacienteAseguradora.findFirst({
        where: { pacienteId: data.pacienteId, aseguradoraId: data.aseguradoraId, activo: true },
      });
      if (!afiliacion) {
        throw new HttpError(400, `El paciente no tiene ${aseguradora.nombre} registrada como seguro`);
      }
      if (aseguradora.requiereAutorizacion || data.autorizacionId) {
        const autorizacion = await resolverAutorizacion(
          tx,
          data.pacienteId,
          data.aseguradoraId,
          unidades,
          data.autorizacionId
        );
        autorizacionId = autorizacion.id;
      }
    } else if (data.autorizacionId) {
      throw new HttpError(400, "Una autorización solo aplica a facturas con aseguradora");
    }

    const { montoAseguradora, montoPaciente } = calcularSplitFactura(total, aseguradora, unidades);
    const numeroFactura = await siguienteNumero("LM", tx);

    return tx.factura.create({
      data: {
        numeroFactura,
        pacienteId: data.pacienteId,
        aseguradoraId: data.aseguradoraId,
        autorizacionId,
        subtotal,
        impuestos,
        total,
        montoAseguradora,
        montoPaciente,
        notas: data.notas,
        detalles: { create: detallesConPrecio },
      },
      include: { detalles: true },
    });
  });
}

// Suma lo cobrado (sin pagos anulados) para que el cliente no tenga que
// recalcular el saldo filtrando pagos.
function conSaldo<T extends { total: Prisma.Decimal; pagos: { monto: Prisma.Decimal; anulado: boolean }[] }>(
  factura: T
) {
  const pagado = sumarPagosActivos(factura.pagos);
  return { ...factura, pagado, saldo: factura.total.sub(pagado) };
}

export async function listarFacturas(pacienteId?: string, estado?: string) {
  const facturas = await prisma.factura.findMany({
    where: {
      pacienteId,
      estado: estado ? (estado as EstadoFactura) : undefined,
    },
    orderBy: { fecha: "desc" },
    include: {
      paciente: { select: { nombres: true, apellidos: true, documento: true } },
      aseguradora: true,
      pagos: { orderBy: { fecha: "asc" } },
    },
  });
  return facturas.map(conSaldo);
}

export async function obtenerFactura(id: string) {
  const factura = await prisma.factura.findUnique({
    where: { id },
    include: {
      paciente: true,
      aseguradora: true,
      autorizacion: true,
      detalles: { include: { tarifa: true } },
      pagos: {
        orderBy: { fecha: "asc" },
        include: {
          registradoPor: { select: { nombre: true, apellido: true } },
          anuladoPor: { select: { nombre: true, apellido: true } },
        },
      },
    },
  });
  if (!factura) throw new HttpError(404, "Factura no encontrada");
  return conSaldo(factura);
}

// Toma un candado sobre la fila de la factura hasta el fin de la transacción:
// pagos, anulaciones de pago y anulación de la factura se serializan, así dos
// cobros simultáneos no pueden superar el total.
async function bloquearFactura(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM facturas WHERE id = ${id} FOR UPDATE`;
  const factura = await tx.factura.findUnique({ where: { id }, include: { pagos: true } });
  if (!factura) throw new HttpError(404, "Factura no encontrada");
  return factura;
}

// Una factura con dinero cobrado no se anula directamente: primero se anulan
// (reembolsan) sus pagos, para que ingresos y caja cuadren.
export async function anularFactura(id: string) {
  return prisma.$transaction(async (tx) => {
    const factura = await bloquearFactura(tx, id);
    if (factura.estado === "ANULADA") throw new HttpError(400, "La factura ya está anulada");
    if (factura.pagos.some((p) => !p.anulado)) {
      throw new HttpError(
        400,
        "La factura tiene pagos registrados. Anula primero esos pagos (reembolso) y luego la factura."
      );
    }
    return tx.factura.update({ where: { id }, data: { estado: "ANULADA" } });
  });
}

// ---------- Pagos ----------

export async function registrarPago(
  facturaId: string,
  registradoPorId: string,
  data: RegistrarPagoInput
) {
  return prisma.$transaction(async (tx) => {
    const factura = await bloquearFactura(tx, facturaId);
    if (factura.estado === "ANULADA") throw new HttpError(400, "La factura está anulada");

    const nuevoTotalPagado = sumarPagosActivos(factura.pagos).add(data.monto);
    if (nuevoTotalPagado.gt(factura.total)) {
      throw new HttpError(400, "El monto excede el saldo pendiente de la factura");
    }

    const pago = await tx.pago.create({
      data: {
        facturaId,
        monto: data.monto,
        metodoPago: data.metodoPago,
        referencia: data.referencia,
        fecha: data.fecha ?? new Date(),
        registradoPorId,
      },
    });

    await tx.factura.update({
      where: { id: facturaId },
      data: { estado: estadoSegunPagos(factura.total, nuevoTotalPagado) },
    });

    return pago;
  });
}

export async function anularPago(
  facturaId: string,
  pagoId: string,
  anuladoPorId: string,
  data: AnularPagoInput
) {
  return prisma.$transaction(async (tx) => {
    const factura = await bloquearFactura(tx, facturaId);
    const pago = factura.pagos.find((p) => p.id === pagoId);
    if (!pago) throw new HttpError(404, "Pago no encontrado en esta factura");
    if (pago.anulado) throw new HttpError(400, "El pago ya está anulado");

    const anulado = await tx.pago.update({
      where: { id: pagoId },
      data: {
        anulado: true,
        anuladoEn: new Date(),
        anuladoPorId,
        motivoAnulacion: data.motivo,
      },
    });

    const pagado = sumarPagosActivos(factura.pagos.filter((p) => p.id !== pagoId));
    await tx.factura.update({
      where: { id: facturaId },
      data: { estado: estadoSegunPagos(factura.total, pagado) },
    });

    return anulado;
  });
}

export async function estadoDeCuentaPaciente(pacienteId: string) {
  const facturas = await prisma.factura.findMany({
    where: { pacienteId, estado: { not: "ANULADA" } },
    include: { pagos: true },
    orderBy: { fecha: "desc" },
  });

  const resumen = facturas.map((f) => {
    const pagado = sumarPagosActivos(f.pagos);
    return {
      facturaId: f.id,
      numeroFactura: f.numeroFactura,
      fecha: f.fecha,
      total: f.total,
      pagado,
      saldo: f.total.sub(pagado),
      estado: f.estado,
    };
  });

  const saldoTotal = resumen.reduce((acc, r) => acc.add(r.saldo), CERO);

  return { facturas: resumen, saldoTotal };
}
