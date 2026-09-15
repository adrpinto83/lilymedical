import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { CrearFacturaInput, RegistrarPagoInput, TarifaInput } from "./facturacion.schema";

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

// ---------- Facturas ----------

async function generarNumeroFactura(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.factura.count({
    where: { numeroFactura: { startsWith: `LM-${year}-` } },
  });
  return `LM-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function crearFactura(data: CrearFacturaInput) {
  const tarifas = await prisma.tarifa.findMany({
    where: { id: { in: data.detalles.map((d) => d.tarifaId) } },
  });
  const tarifaMap = new Map(tarifas.map((t) => [t.id, t]));

  let subtotal = new Prisma.Decimal(0);
  const detallesConPrecio = data.detalles.map((d) => {
    const tarifa = tarifaMap.get(d.tarifaId);
    if (!tarifa) throw new HttpError(400, `Tarifa ${d.tarifaId} no existe`);
    const precioUnitario = tarifa.precio;
    const detalleSubtotal = precioUnitario.mul(d.cantidad);
    subtotal = subtotal.add(detalleSubtotal);
    return {
      tarifaId: d.tarifaId,
      citaId: d.citaId,
      sesionId: d.sesionId,
      descripcion: d.descripcion ?? tarifa.nombreServicio,
      cantidad: d.cantidad,
      precioUnitario,
      subtotal: detalleSubtotal,
    };
  });

  const impuestos = new Prisma.Decimal(data.impuestos);
  const total = subtotal.add(impuestos);
  const numeroFactura = await generarNumeroFactura();

  return prisma.factura.create({
    data: {
      numeroFactura,
      pacienteId: data.pacienteId,
      aseguradoraId: data.aseguradoraId,
      subtotal,
      impuestos,
      total,
      notas: data.notas,
      detalles: { create: detallesConPrecio },
    },
    include: { detalles: true },
  });
}

export async function listarFacturas(pacienteId?: string, estado?: string) {
  return prisma.factura.findMany({
    where: {
      pacienteId,
      estado: estado ? (estado as any) : undefined,
    },
    orderBy: { fecha: "desc" },
    include: {
      paciente: { select: { nombres: true, apellidos: true, documento: true } },
      pagos: true,
    },
  });
}

export async function obtenerFactura(id: string) {
  const factura = await prisma.factura.findUnique({
    where: { id },
    include: {
      paciente: true,
      aseguradora: true,
      detalles: { include: { tarifa: true } },
      pagos: { include: { registradoPor: { select: { nombre: true, apellido: true } } } },
    },
  });
  if (!factura) throw new HttpError(404, "Factura no encontrada");
  return factura;
}

export async function anularFactura(id: string) {
  const factura = await prisma.factura.findUnique({ where: { id } });
  if (!factura) throw new HttpError(404, "Factura no encontrada");
  if (factura.estado === "PAGADA") {
    throw new HttpError(400, "No se puede anular una factura ya pagada. Registra una nota de crédito manualmente.");
  }
  return prisma.factura.update({ where: { id }, data: { estado: "ANULADA" } });
}

// ---------- Pagos ----------

export async function registrarPago(
  facturaId: string,
  registradoPorId: string,
  data: RegistrarPagoInput
) {
  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: { pagos: true },
  });
  if (!factura) throw new HttpError(404, "Factura no encontrada");
  if (factura.estado === "ANULADA") throw new HttpError(400, "La factura está anulada");

  const totalPagadoPrevio = factura.pagos.reduce(
    (acc, p) => acc.add(p.monto),
    new Prisma.Decimal(0)
  );
  const nuevoTotalPagado = totalPagadoPrevio.add(data.monto);

  if (nuevoTotalPagado.gt(factura.total)) {
    throw new HttpError(400, "El monto excede el saldo pendiente de la factura");
  }

  const pago = await prisma.pago.create({
    data: {
      facturaId,
      monto: data.monto,
      metodoPago: data.metodoPago,
      referencia: data.referencia,
      fecha: data.fecha ?? new Date(),
      registradoPorId,
    },
  });

  const nuevoEstado = nuevoTotalPagado.eq(factura.total)
    ? "PAGADA"
    : nuevoTotalPagado.gt(0)
      ? "PARCIAL"
      : "PENDIENTE";

  await prisma.factura.update({ where: { id: facturaId }, data: { estado: nuevoEstado } });

  return pago;
}

export async function estadoDeCuentaPaciente(pacienteId: string) {
  const facturas = await prisma.factura.findMany({
    where: { pacienteId, estado: { not: "ANULADA" } },
    include: { pagos: true },
    orderBy: { fecha: "desc" },
  });

  const resumen = facturas.map((f) => {
    const pagado = f.pagos.reduce((acc, p) => acc.add(p.monto), new Prisma.Decimal(0));
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

  const saldoTotal = resumen.reduce((acc, r) => acc.add(r.saldo), new Prisma.Decimal(0));

  return { facturas: resumen, saldoTotal };
}
