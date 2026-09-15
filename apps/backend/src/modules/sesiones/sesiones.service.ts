import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { CrearSesionInput, ActualizarSesionInput } from "./sesiones.schema";

export async function crearSesion(terapeutaId: string, data: CrearSesionInput) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId: data.pacienteId },
  });
  if (!historia) throw new HttpError(404, "El paciente no tiene historia clínica");

  const sesion = await prisma.sesion.create({
    data: {
      historiaClinicaId: historia.id,
      citaId: data.citaId,
      terapeutaId,
      notaEvolucion: data.notaEvolucion,
      tratamientoAplicado: data.tratamientoAplicado,
      asistencia: data.asistencia,
      fecha: data.fecha ?? new Date(),
    },
  });

  // Si la sesión proviene de una cita, se marca como atendida
  if (data.citaId) {
    await prisma.cita.update({
      where: { id: data.citaId },
      data: { estado: "ATENDIDA" },
    });
  }

  return sesion;
}

export async function actualizarSesion(id: string, data: ActualizarSesionInput) {
  const sesion = await prisma.sesion.findUnique({ where: { id } });
  if (!sesion) throw new HttpError(404, "Sesión no encontrada");
  return prisma.sesion.update({ where: { id }, data });
}

export async function eliminarSesion(id: string) {
  const sesion = await prisma.sesion.findUnique({ where: { id } });
  if (!sesion) throw new HttpError(404, "Sesión no encontrada");
  return prisma.sesion.delete({ where: { id } });
}
