import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { ActualizarHistoriaInput, CrearEvaluacionInput } from "./historias-clinicas.schema";

export async function obtenerHistoriaPorPaciente(pacienteId: string) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId },
    include: {
      evaluaciones: { orderBy: { fecha: "desc" }, include: { evaluador: { select: { nombre: true, apellido: true } } } },
      sesiones: { orderBy: { fecha: "desc" }, include: { terapeuta: { select: { nombre: true, apellido: true } } } },
      adjuntos: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");
  return historia;
}

export async function obtenerHistoriaParaPdf(pacienteId: string) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId },
    include: {
      paciente: true,
      evaluaciones: { orderBy: { fecha: "asc" }, include: { evaluador: { select: { nombre: true, apellido: true } } } },
      sesiones: { orderBy: { fecha: "asc" }, include: { terapeuta: { select: { nombre: true, apellido: true } } } },
    },
  });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");
  return historia;
}

export async function actualizarHistoria(pacienteId: string, data: ActualizarHistoriaInput) {
  const historia = await prisma.historiaClinica.findUnique({ where: { pacienteId } });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");
  return prisma.historiaClinica.update({ where: { pacienteId }, data });
}

export async function agregarEvaluacion(
  pacienteId: string,
  evaluadorId: string,
  data: CrearEvaluacionInput
) {
  const historia = await prisma.historiaClinica.findUnique({ where: { pacienteId } });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");

  return prisma.evaluacionFisiatrica.create({
    data: {
      historiaClinicaId: historia.id,
      evaluadorId,
      tipoEscala: data.tipoEscala,
      nombreEscala: data.nombreEscala,
      datos: data.datos,
      puntajeTotal: data.puntajeTotal,
      observaciones: data.observaciones,
      fecha: data.fecha ?? new Date(),
    },
  });
}

// Línea de tiempo de evolución: combina sesiones y evaluaciones en orden cronológico
export async function obtenerLineaDeTiempo(pacienteId: string) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId },
    include: {
      sesiones: { include: { terapeuta: { select: { nombre: true, apellido: true } } } },
      evaluaciones: { include: { evaluador: { select: { nombre: true, apellido: true } } } },
    },
  });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");

  const eventos = [
    ...historia.sesiones.map((s) => ({ tipo: "SESION" as const, fecha: s.fecha, data: s })),
    ...historia.evaluaciones.map((e) => ({ tipo: "EVALUACION" as const, fecha: e.fecha, data: e })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return eventos;
}
