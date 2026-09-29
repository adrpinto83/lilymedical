import { randomUUID } from "crypto";
import { EstadoCita, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import {
  CrearCitaInput,
  CrearCitasRecurrentesInput,
  ActualizarCitaInput,
  CrearBloqueoInput,
} from "./citas.schema";

const citaInclude = {
  paciente: { select: { id: true, nombres: true, apellidos: true, telefono: true } },
  profesional: { select: { id: true, nombre: true, apellido: true } },
  tarifa: true,
} satisfies Prisma.CitaInclude;

// Estados que ya no ocupan el horario del profesional.
const ESTADOS_LIBERAN_HORARIO: EstadoCita[] = ["CANCELADA", "NO_ASISTIO"];

// El mensaje nombra al paciente o el motivo del bloqueo con el que choca para
// que quien agenda sepa qué mover sin tener que buscarlo en la agenda.
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
      estado: { notIn: ESTADOS_LIBERAN_HORARIO },
      fechaHoraInicio: { lt: fin },
      fechaHoraFin: { gt: inicio },
    },
    include: { paciente: { select: { nombres: true, apellidos: true } } },
  });
  if (conflictoCita) {
    const { apellidos, nombres } = conflictoCita.paciente;
    throw new HttpError(
      409,
      `El profesional ya tiene una cita en ese horario (paciente: ${apellidos}, ${nombres})`
    );
  }

  const conflictoBloqueo = await prisma.bloqueoHorario.findFirst({
    where: {
      profesionalId,
      fechaHoraInicio: { lt: fin },
      fechaHoraFin: { gt: inicio },
    },
  });
  if (conflictoBloqueo) {
    throw new HttpError(
      409,
      `El profesional tiene bloqueado ese horario${conflictoBloqueo.motivo ? ` (${conflictoBloqueo.motivo})` : ""}`
    );
  }
}

export async function listarCitas(desde: Date, hasta: Date, profesionalId?: string, pacienteId?: string) {
  return prisma.cita.findMany({
    where: {
      fechaHoraInicio: { gte: desde },
      fechaHoraFin: { lte: hasta },
      profesionalId,
      pacienteId,
    },
    orderBy: { fechaHoraInicio: "asc" },
    include: citaInclude,
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
  for (const [index, fecha] of fechas.entries()) {
    const fin = new Date(fecha.getTime() + data.duracionMinutos * 60000);
    try {
      await verificarDisponibilidad(data.profesionalId, fecha, fin);
    } catch (err) {
      if (err instanceof HttpError) {
        throw new HttpError(err.status, `Sesión ${index + 1} de ${data.totalSesiones}: ${err.message}`);
      }
      throw err;
    }
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

  const profesionalId = data.profesionalId ?? cita.profesionalId;
  const inicio = data.fechaHoraInicio ?? cita.fechaHoraInicio;
  const fin = data.fechaHoraFin ?? cita.fechaHoraFin;
  const estado = data.estado ?? cita.estado;

  const reprograma =
    profesionalId !== cita.profesionalId ||
    inicio.getTime() !== cita.fechaHoraInicio.getTime() ||
    fin.getTime() !== cita.fechaHoraFin.getTime();

  if (reprograma && cita.estado === "ATENDIDA") {
    throw new HttpError(409, "No se puede reprogramar una cita ya atendida");
  }
  if (fin <= inicio) {
    throw new HttpError(400, "La hora de fin debe ser posterior a la de inicio");
  }

  // Si cambia el horario o se reactiva una cita cancelada / no asistida, el
  // hueco pudo haberse ocupado mientras tanto.
  const reactiva = ESTADOS_LIBERAN_HORARIO.includes(cita.estado) && !ESTADOS_LIBERAN_HORARIO.includes(estado);
  if ((reprograma && !ESTADOS_LIBERAN_HORARIO.includes(estado)) || reactiva) {
    await verificarDisponibilidad(profesionalId, inicio, fin, id);
  }

  return prisma.cita.update({
    where: { id },
    // Al cambiar la fecha el recordatorio ya enviado quedó desactualizado.
    data: reprograma ? { ...data, recordatorioEnviado: false } : data,
    include: citaInclude,
  });
}

// Todas las sesiones de un paquete, para ver el avance desde cualquiera de ellas.
export async function listarGrupoRecurrente(grupoRecurrenciaId: string) {
  return prisma.cita.findMany({
    where: { grupoRecurrenciaId },
    orderBy: { fechaHoraInicio: "asc" },
    include: citaInclude,
  });
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
