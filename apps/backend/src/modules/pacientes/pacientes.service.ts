import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import {
  CrearPacienteInput,
  ActualizarPacienteInput,
  PacienteAseguradoraInput,
} from "./pacientes.schema";
import * as correos from "../correos/correos.service";
import { uploadsDir } from "../../lib/uploads";
import fs from "fs";
import path from "path";

export const fotosDir = path.join(uploadsDir, "fotos-pacientes");
if (!fs.existsSync(fotosDir)) fs.mkdirSync(fotosDir, { recursive: true });

function borrarArchivoFoto(nombre: string | null) {
  if (!nombre) return;
  const ruta = path.join(fotosDir, path.basename(nombre));
  if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
}

/** Guarda la foto subida (ya en disco) y borra la anterior. */
export async function guardarFoto(pacienteId: string, archivo: string) {
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) {
    borrarArchivoFoto(archivo);
    throw new HttpError(404, "Paciente no encontrado");
  }
  const actualizado = await prisma.paciente.update({ where: { id: pacienteId }, data: { fotoUrl: archivo } });
  borrarArchivoFoto(paciente.fotoUrl);
  return actualizado;
}

export async function quitarFoto(pacienteId: string) {
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) throw new HttpError(404, "Paciente no encontrado");
  const actualizado = await prisma.paciente.update({ where: { id: pacienteId }, data: { fotoUrl: null } });
  borrarArchivoFoto(paciente.fotoUrl);
  return actualizado;
}

export async function rutaFoto(pacienteId: string) {
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId }, select: { fotoUrl: true } });
  const ruta = paciente?.fotoUrl ? path.join(fotosDir, path.basename(paciente.fotoUrl)) : null;
  if (!ruta || !fs.existsSync(ruta)) throw new HttpError(404, "El paciente no tiene foto");
  return ruta;
}

const includeAseguradoras = {
  aseguradoras: { include: { aseguradora: true }, where: { activo: true } },
} as const;

// Para la lista: la próxima cita pendiente de cada paciente (dato de agenda,
// no clínico), con su lugar en el paquete de sesiones si lo tiene.
const includeLista = () =>
  ({
    ...includeAseguradoras,
    citas: {
      where: { estado: { in: ["PROGRAMADA", "CONFIRMADA"] }, fechaHoraInicio: { gte: new Date() } },
      orderBy: { fechaHoraInicio: "asc" },
      take: 1,
      select: { id: true, fechaHoraInicio: true, numeroSesionEnGrupo: true, totalSesionesGrupo: true },
    },
  }) satisfies Prisma.PacienteInclude;

export async function listarPacientes(busqueda?: string) {
  if (!busqueda) {
    return prisma.paciente.findMany({
      where: { activo: true },
      orderBy: { apellidos: "asc" },
      include: includeLista(),
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
    include: includeLista(),
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
  correos.enSegundoPlano("bienvenida paciente", () => correos.notificarBienvenidaPaciente(paciente.id));
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
