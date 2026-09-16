import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import {
  CrearPacienteInput,
  ActualizarPacienteInput,
  PacienteAseguradoraInput,
} from "./pacientes.schema";

const includeAseguradoras = {
  aseguradoras: { include: { aseguradora: true }, where: { activo: true } },
} as const;

export async function listarPacientes(busqueda?: string) {
  if (!busqueda) {
    return prisma.paciente.findMany({
      where: { activo: true },
      orderBy: { apellidos: "asc" },
      include: includeAseguradoras,
    });
  }

  return prisma.paciente.findMany({
    where: {
      activo: true,
      OR: [
        { nombres: { contains: busqueda, mode: "insensitive" } },
        { apellidos: { contains: busqueda, mode: "insensitive" } },
        { documento: { contains: busqueda, mode: "insensitive" } },
        { telefono: { contains: busqueda, mode: "insensitive" } },
      ],
    },
    orderBy: { apellidos: "asc" },
    include: includeAseguradoras,
  });
}

export async function obtenerPaciente(id: string) {
  const paciente = await prisma.paciente.findUnique({
    where: { id },
    include: includeAseguradoras,
  });
  if (!paciente) throw new HttpError(404, "Paciente no encontrado");
  return paciente;
}

export async function crearPaciente(data: CrearPacienteInput) {
  const paciente = await prisma.paciente.create({
    data: {
      ...data,
      email: data.email || undefined,
    },
  });
  // Cada paciente arranca con su historia clínica vacía lista para llenarse
  await prisma.historiaClinica.create({ data: { pacienteId: paciente.id } });
  return paciente;
}

export async function actualizarPaciente(id: string, data: ActualizarPacienteInput) {
  await obtenerPaciente(id);
  return prisma.paciente.update({ where: { id }, data });
}

export async function desactivarPaciente(id: string) {
  await obtenerPaciente(id);
  return prisma.paciente.update({ where: { id }, data: { activo: false } });
}

// ---------- Relación con aseguradoras (primaria/secundaria) ----------

export async function listarAseguradorasDePaciente(pacienteId: string) {
  return prisma.pacienteAseguradora.findMany({
    where: { pacienteId, activo: true },
    include: { aseguradora: true },
    orderBy: { esPrimaria: "desc" },
  });
}

export async function agregarAseguradoraAPaciente(
  pacienteId: string,
  data: PacienteAseguradoraInput
) {
  await obtenerPaciente(pacienteId);

  if (data.esPrimaria) {
    await prisma.pacienteAseguradora.updateMany({
      where: { pacienteId },
      data: { esPrimaria: false },
    });
  }

  return prisma.pacienteAseguradora.create({
    data: {
      pacienteId,
      aseguradoraId: data.aseguradoraId,
      numeroAfiliacion: data.numeroAfiliacion,
      esPrimaria: data.esPrimaria ?? false,
    },
    include: { aseguradora: true },
  });
}

export async function actualizarAseguradoraDePaciente(
  pacienteId: string,
  relacionId: string,
  data: Partial<PacienteAseguradoraInput>
) {
  const relacion = await prisma.pacienteAseguradora.findUnique({ where: { id: relacionId } });
  if (!relacion || relacion.pacienteId !== pacienteId) {
    throw new HttpError(404, "Relación paciente-aseguradora no encontrada");
  }

  if (data.esPrimaria) {
    await prisma.pacienteAseguradora.updateMany({
      where: { pacienteId, id: { not: relacionId } },
      data: { esPrimaria: false },
    });
  }

  return prisma.pacienteAseguradora.update({
    where: { id: relacionId },
    data,
    include: { aseguradora: true },
  });
}

export async function eliminarAseguradoraDePaciente(pacienteId: string, relacionId: string) {
  const relacion = await prisma.pacienteAseguradora.findUnique({ where: { id: relacionId } });
  if (!relacion || relacion.pacienteId !== pacienteId) {
    throw new HttpError(404, "Relación paciente-aseguradora no encontrada");
  }
  await prisma.pacienteAseguradora.update({ where: { id: relacionId }, data: { activo: false } });
}
