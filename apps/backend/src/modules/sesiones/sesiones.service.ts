import { EstadoAsistencia, EstadoCita } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { CrearSesionInput, ActualizarSesionInput } from "./sesiones.schema";

// Estado en que queda la cita según la asistencia registrada en la sesión:
// una inasistencia no puede contar como cita atendida.
export const ESTADO_CITA_POR_ASISTENCIA: Record<EstadoAsistencia, EstadoCita> = {
  ASISTIO: "ATENDIDA",
  INASISTIO: "NO_ASISTIO",
  CANCELO: "CANCELADA",
};

export async function crearSesion(terapeutaId: string, data: CrearSesionInput) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId: data.pacienteId },
  });
  if (!historia) throw new HttpError(404, "El paciente no tiene historia clínica");

  if (data.citaId) {
    const cita = await prisma.cita.findUnique({ where: { id: data.citaId } });
    if (!cita) throw new HttpError(404, "Cita no encontrada");
    if (cita.pacienteId !== data.pacienteId) {
      throw new HttpError(400, "La cita pertenece a otro paciente");
    }
  }

  return prisma.$transaction(async (tx) => {
    const sesion = await tx.sesion.create({
      data: {
        historiaClinicaId: historia.id,
        citaId: data.citaId,
        terapeutaId,
        notaEvolucion: data.notaEvolucion,
        tratamientoAplicado: data.tratamientoAplicado,
        asistencia: data.asistencia,
        evaPre: data.evaPre,
        evaPost: data.evaPost,
        modalidades: data.modalidades ?? [],
        fecha: data.fecha ?? new Date(),
      },
    });

    if (data.citaId) {
      await tx.cita.update({
        where: { id: data.citaId },
        data: { estado: ESTADO_CITA_POR_ASISTENCIA[data.asistencia] },
      });
    }

    return sesion;
  });
}

export async function actualizarSesion(id: string, data: ActualizarSesionInput) {
  const sesion = await prisma.sesion.findUnique({ where: { id } });
  if (!sesion) throw new HttpError(404, "Sesión no encontrada");

  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.sesion.update({ where: { id }, data });
    if (sesion.citaId && data.asistencia && data.asistencia !== sesion.asistencia) {
      await tx.cita.update({
        where: { id: sesion.citaId },
        data: { estado: ESTADO_CITA_POR_ASISTENCIA[data.asistencia] },
      });
    }
    return actualizada;
  });
}

// Sin la nota de evolución la cita deja de estar resuelta: vuelve a
// PROGRAMADA para que se registre de nuevo su atención o inasistencia.
export async function eliminarSesion(id: string) {
  const sesion = await prisma.sesion.findUnique({ where: { id } });
  if (!sesion) throw new HttpError(404, "Sesión no encontrada");

  return prisma.$transaction(async (tx) => {
    const eliminada = await tx.sesion.delete({ where: { id } });
    if (sesion.citaId) {
      await tx.cita.update({ where: { id: sesion.citaId }, data: { estado: "PROGRAMADA" } });
    }
    return eliminada;
  });
}
