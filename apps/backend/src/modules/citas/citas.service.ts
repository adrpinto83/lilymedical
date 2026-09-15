import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import {
  CrearCitaInput,
  CrearCitasRecurrentesInput,
  ActualizarCitaInput,
  CrearBloqueoInput,
} from "./citas.schema";

async function verificarDisponibilidad(
  profesionalId: string,
  inicio: Date,
  fin: Date,
  citaIdExcluir?: string
) {
  const conflictoCita = await prisma.cita.findFirst({
    where: {
      profesionalId,
      id: citaIdExcluir ? { not: citaIdExcluir } : undefined,
      estado: { notIn: ["CANCELADA", "NO_ASISTIO"] },
      fechaHoraInicio: { lt: fin },
      fechaHoraFin: { gt: inicio },
    },
  });
  if (conflictoCita) {
    throw new HttpError(409, "El profesional ya tiene una cita en ese horario");
  }

  const conflictoBloqueo = await prisma.bloqueoHorario.findFirst({
    where: {
      profesionalId,
      fechaHoraInicio: { lt: fin },
      fechaHoraFin: { gt: inicio },
    },
  });
  if (conflictoBloqueo) {
    throw new HttpError(409, "El profesional tiene bloqueado ese horario");
  }
}

export async function listarCitas(desde: Date, hasta: Date, profesionalId?: string) {
  return prisma.cita.findMany({
    where: {
      fechaHoraInicio: { gte: desde },
      fechaHoraFin: { lte: hasta },
      profesionalId,
    },
    orderBy: { fechaHoraInicio: "asc" },
    include: {
      paciente: { select: { id: true, nombres: true, apellidos: true, telefono: true } },
      profesional: { select: { id: true, nombre: true, apellido: true } },
      tarifa: true,
    },
  });
}

export async function crearCita(data: CrearCitaInput) {
  await verificarDisponibilidad(data.profesionalId, data.fechaHoraInicio, data.fechaHoraFin);
  return prisma.cita.create({ data });
}

export async function crearCitasRecurrentes(data: CrearCitasRecurrentesInput) {
  const grupoRecurrenciaId = randomUUID();
  const fechas: Date[] = [];
  let cursor = new Date(data.fechaHoraInicio);
  const horaInicio = cursor.getHours();
  const minutoInicio = cursor.getMinutes();

  // Avanza día a día hasta juntar `totalSesiones` fechas que caigan en diasSemana
  const limiteDias = 400; // guarda contra loops infinitos
  let diasRevisados = 0;
  while (fechas.length < data.totalSesiones && diasRevisados < limiteDias) {
    if (data.diasSemana.includes(cursor.getDay())) {
      const fecha = new Date(cursor);
      fecha.setHours(horaInicio, minutoInicio, 0, 0);
      fechas.push(fecha);
    }
    cursor.setDate(cursor.getDate() + 1);
    diasRevisados++;
  }

  if (fechas.length < data.totalSesiones) {
    throw new HttpError(400, "No se pudieron calcular todas las fechas de sesiones");
  }

  // Verifica disponibilidad de todas las fechas antes de crear nada
  for (const fecha of fechas) {
    const fin = new Date(fecha.getTime() + data.duracionMinutos * 60000);
    await verificarDisponibilidad(data.profesionalId, fecha, fin);
  }

  const citas = await prisma.$transaction(
    fechas.map((fecha, index) => {
      const fin = new Date(fecha.getTime() + data.duracionMinutos * 60000);
      return prisma.cita.create({
        data: {
          pacienteId: data.pacienteId,
          profesionalId: data.profesionalId,
          tarifaId: data.tarifaId,
          fechaHoraInicio: fecha,
          fechaHoraFin: fin,
          esRecurrente: true,
          grupoRecurrenciaId,
          numeroSesionEnGrupo: index + 1,
          totalSesionesGrupo: data.totalSesiones,
          notas: data.notas,
        },
      });
    })
  );

  return citas;
}

export async function actualizarCita(id: string, data: ActualizarCitaInput) {
  const cita = await prisma.cita.findUnique({ where: { id } });
  if (!cita) throw new HttpError(404, "Cita no encontrada");

  if (data.fechaHoraInicio || data.fechaHoraFin) {
    await verificarDisponibilidad(
      cita.profesionalId,
      data.fechaHoraInicio ?? cita.fechaHoraInicio,
      data.fechaHoraFin ?? cita.fechaHoraFin,
      id
    );
  }

  return prisma.cita.update({ where: { id }, data });
}

export async function cancelarGrupoRecurrente(grupoRecurrenciaId: string) {
  return prisma.cita.updateMany({
    where: {
      grupoRecurrenciaId,
      estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
    },
    data: { estado: "CANCELADA" },
  });
}

export async function crearBloqueo(data: CrearBloqueoInput) {
  await verificarDisponibilidad(data.profesionalId, data.fechaHoraInicio, data.fechaHoraFin);
  return prisma.bloqueoHorario.create({ data });
}

export async function eliminarBloqueo(id: string) {
  const bloqueo = await prisma.bloqueoHorario.findUnique({ where: { id } });
  if (!bloqueo) throw new HttpError(404, "Bloqueo no encontrado");
  return prisma.bloqueoHorario.delete({ where: { id } });
}

export async function listarBloqueos(desde: Date, hasta: Date, profesionalId?: string) {
  return prisma.bloqueoHorario.findMany({
    where: {
      fechaHoraInicio: { gte: desde },
      fechaHoraFin: { lte: hasta },
      profesionalId,
    },
    orderBy: { fechaHoraInicio: "asc" },
  });
}
