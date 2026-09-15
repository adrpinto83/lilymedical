import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { CrearConstanciaInput } from "./constancias.schema";

async function generarNumeroConstancia(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.constanciaMedica.count({
    where: { numeroConstancia: { startsWith: `CM-${year}-` } },
  });
  return `CM-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function crearConstancia(medicoId: string, data: CrearConstanciaInput) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId: data.pacienteId },
  });
  if (!historia) throw new HttpError(404, "El paciente no tiene historia clínica");

  const numeroConstancia = await generarNumeroConstancia();

  return prisma.constanciaMedica.create({
    data: {
      numeroConstancia,
      pacienteId: data.pacienteId,
      historiaClinicaId: historia.id,
      medicoId,
      diagnostico: data.diagnostico,
      codigoCIE10: data.codigoCIE10,
      diasReposo: data.diasReposo,
      fechaInicioReposo: data.fechaInicioReposo,
      fechaFinReposo: data.fechaFinReposo,
      motivo: data.motivo,
    },
  });
}

export async function listarConstanciasPorPaciente(pacienteId: string) {
  return prisma.constanciaMedica.findMany({
    where: { pacienteId },
    orderBy: { fecha: "desc" },
    include: { medico: { select: { nombre: true, apellido: true } } },
  });
}

export async function obtenerConstanciaParaPdf(id: string) {
  const constancia = await prisma.constanciaMedica.findUnique({
    where: { id },
    include: { paciente: true },
  });
  if (!constancia) throw new HttpError(404, "Constancia no encontrada");
  return constancia;
}

export async function obtenerConstanciaPorCodigo(codigo: string) {
  return prisma.constanciaMedica.findUnique({
    where: { codigoVerificacion: codigo },
    include: { medico: { select: { nombre: true, apellido: true } } },
  });
}
