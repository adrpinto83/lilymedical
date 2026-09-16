import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { CrearRecetaInput } from "./recetas.schema";

async function generarNumeroReceta(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.receta.count({
    where: { numeroReceta: { startsWith: `RX-${year}-` } },
  });
  return `RX-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function crearReceta(medicoId: string, data: CrearRecetaInput) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId: data.pacienteId },
  });
  if (!historia) throw new HttpError(404, "El paciente no tiene historia clínica");

  const numeroReceta = await generarNumeroReceta();

  return prisma.receta.create({
    data: {
      numeroReceta,
      pacienteId: data.pacienteId,
      historiaClinicaId: historia.id,
      medicoId,
      tipo: data.tipo,
      diagnostico: data.diagnostico,
      indicacionesGenerales: data.indicacionesGenerales,
      fechaVencimiento: data.fechaVencimiento,
      items: {
        create: data.items.map((item, index) => ({ ...item, orden: index })),
      },
    },
    include: { items: true },
  });
}

export async function listarRecetasPorPaciente(pacienteId: string) {
  return prisma.receta.findMany({
    where: { pacienteId },
    orderBy: { fecha: "desc" },
    include: { items: true, medico: { select: { nombre: true, apellido: true } } },
  });
}

export async function obtenerRecetaParaPdf(id: string) {
  const receta = await prisma.receta.findUnique({
    where: { id },
    include: {
      items: { orderBy: { orden: "asc" } },
      paciente: true,
      historiaClinica: { select: { alergias: true } },
    },
  });
  if (!receta) throw new HttpError(404, "Receta no encontrada");
  return receta;
}

export async function obtenerRecetaPorCodigo(codigo: string) {
  return prisma.receta.findUnique({
    where: { codigoVerificacion: codigo },
    include: { medico: { select: { nombre: true, apellido: true } } },
  });
}
