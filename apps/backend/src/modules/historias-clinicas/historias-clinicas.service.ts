import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { fechaConsultorio } from "../../lib/pdf";
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

export interface OpcionesExportarHistoria {
  desde?: Date;
  hasta?: Date;
  incluirImagenes?: boolean;
}

export async function obtenerHistoriaParaPdf(
  pacienteId: string,
  opciones: OpcionesExportarHistoria = {}
) {
  const { desde, hasta, incluirImagenes } = opciones;
  const rangoFecha =
    desde || hasta
      ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
      : {};

  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId },
    include: {
      paciente: true,
      evaluaciones: {
        where: rangoFecha,
        orderBy: { fecha: "asc" },
        include: { evaluador: { select: { nombre: true, apellido: true } } },
      },
      sesiones: {
        where: rangoFecha,
        orderBy: { fecha: "asc" },
        include: { terapeuta: { select: { nombre: true, apellido: true } } },
      },
      adjuntos: incluirImagenes
        ? { where: { tipo: "IMAGEN" }, orderBy: { createdAt: "asc" } }
        : false,
    },
  });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");
  return historia;
}

/**
 * Datos del informe de UNA consulta: lo registrado el mismo día (hora del
 * consultorio) que la sesión o evaluación elegida, más identificación y
 * diagnóstico. Es lo que se le entrega al paciente; los antecedentes y el
 * resto de la historia quedan fuera.
 */
export async function obtenerConsultaParaPdf(
  pacienteId: string,
  referencia: { tipo: "sesion" | "evaluacion"; id: string }
) {
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId },
    include: { paciente: true },
  });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");

  const registro =
    referencia.tipo === "sesion"
      ? await prisma.sesion.findFirst({ where: { id: referencia.id, historiaClinicaId: historia.id } })
      : await prisma.evaluacionFisiatrica.findFirst({ where: { id: referencia.id, historiaClinicaId: historia.id } });
  if (!registro) throw new HttpError(404, "Consulta no encontrada");

  // Margen amplio en la consulta y filtro exacto por día del consultorio
  // (el servidor puede estar en UTC).
  const dia = fechaConsultorio(registro.fecha);
  const margen = 36 * 60 * 60 * 1000;
  const rango = {
    historiaClinicaId: historia.id,
    fecha: { gte: new Date(registro.fecha.getTime() - margen), lte: new Date(registro.fecha.getTime() + margen) },
  };
  const [sesiones, evaluaciones] = await Promise.all([
    prisma.sesion.findMany({
      where: rango,
      orderBy: { fecha: "asc" },
      include: { terapeuta: { select: { nombre: true, apellido: true } } },
    }),
    prisma.evaluacionFisiatrica.findMany({
      where: rango,
      orderBy: { fecha: "asc" },
      include: { evaluador: { select: { nombre: true, apellido: true } } },
    }),
  ]);

  return {
    paciente: historia.paciente,
    ocupacion: historia.ocupacion,
    diagnosticoPrincipal: historia.diagnosticoPrincipal,
    codigoCIE10: historia.codigoCIE10,
    fecha: registro.fecha,
    // Las inasistencias no son parte de la consulta, salvo que sea justo la elegida.
    sesiones: sesiones.filter(
      (s) => fechaConsultorio(s.fecha) === dia && (s.asistencia === "ASISTIO" || s.id === referencia.id)
    ),
    evaluaciones: evaluaciones.filter((e) => fechaConsultorio(e.fecha) === dia),
  };
}

export type ConsultaParaPdf = Awaited<ReturnType<typeof obtenerConsultaParaPdf>>;

export async function actualizarHistoria(pacienteId: string, data: ActualizarHistoriaInput) {
  const historia = await prisma.historiaClinica.findUnique({ where: { pacienteId } });
  if (!historia) throw new HttpError(404, "Historia clínica no encontrada");
  const { dominancia, ...resto } = data;
  return prisma.historiaClinica.update({
    where: { pacienteId },
    data: { ...resto, ...(dominancia !== undefined ? { dominancia: dominancia || null } : {}) },
  });
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
