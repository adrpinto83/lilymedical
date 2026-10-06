import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { siguienteNumero } from "../../lib/correlativos";
import { CrearPresupuestoInput } from "./presupuestos.schema";

const redondear2 = (n: number) => Math.round(n * 100) / 100;

export async function crearPresupuesto(usuarioId: string, data: CrearPresupuestoInput) {
  const paciente = await prisma.paciente.findUnique({ where: { id: data.pacienteId } });
  if (!paciente) throw new HttpError(404, "Paciente no encontrado");

  const items = data.items.map((i) => ({
    tarifaId: i.tarifaId,
    descripcion: i.descripcion,
    cantidad: i.cantidad,
    precioUnitario: new Prisma.Decimal(i.precioUnitario),
    subtotal: new Prisma.Decimal(redondear2(i.cantidad * i.precioUnitario)),
  }));
  const total = items.reduce((a, i) => a.add(i.subtotal), new Prisma.Decimal(0));

  // El número solo se consume si el presupuesto llega a crearse.
  return prisma.$transaction(async (tx) => {
    const numeroPresupuesto = await siguienteNumero("PR", tx);
    return tx.presupuesto.create({
      data: {
        numeroPresupuesto,
        pacienteId: data.pacienteId,
        creadoPorId: usuarioId,
        diagnostico: data.diagnostico || null,
        tasaCambio: data.tasaCambio !== undefined ? new Prisma.Decimal(data.tasaCambio) : null,
        notas: data.notas || null,
        total,
        items: { create: items },
      },
      include: { items: true },
    });
  });
}

export async function listarPresupuestos(filtros: { pacienteId?: string; q?: string }) {
  return prisma.presupuesto.findMany({
    where: {
      ...(filtros.pacienteId ? { pacienteId: filtros.pacienteId } : {}),
      ...(filtros.q
        ? {
            OR: [
              { numeroPresupuesto: { contains: filtros.q, mode: "insensitive" as const } },
              { paciente: { nombres: { contains: filtros.q, mode: "insensitive" as const } } },
              { paciente: { apellidos: { contains: filtros.q, mode: "insensitive" as const } } },
              { paciente: { documento: { contains: filtros.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: { fecha: "desc" },
    take: 200,
    include: {
      paciente: { select: { id: true, nombres: true, apellidos: true, documento: true } },
      items: true,
    },
  });
}

export async function obtenerPresupuestoParaPdf(id: string) {
  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id },
    include: { paciente: true, items: true },
  });
  if (!presupuesto) throw new HttpError(404, "Presupuesto no encontrado");
  return presupuesto;
}

export async function anularPresupuesto(id: string) {
  const presupuesto = await prisma.presupuesto.findUnique({ where: { id } });
  if (!presupuesto) throw new HttpError(404, "Presupuesto no encontrado");
  return prisma.presupuesto.update({ where: { id }, data: { anulado: true } });
}
