import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { CrearPacienteInput, ActualizarPacienteInput } from "./pacientes.schema";

export async function listarPacientes(busqueda?: string) {
  if (!busqueda) {
    return prisma.paciente.findMany({
      where: { activo: true },
      orderBy: { apellidos: "asc" },
      include: { aseguradora: true },
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
    include: { aseguradora: true },
  });
}

export async function obtenerPaciente(id: string) {
  const paciente = await prisma.paciente.findUnique({
    where: { id },
    include: { aseguradora: true },
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
