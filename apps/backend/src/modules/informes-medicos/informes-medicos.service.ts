import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { siguienteNumero } from "../../lib/correlativos";
import { CrearInformeInput } from "./informes-medicos.schema";

// Mediodía UTC: en Caracas (UTC-4) sigue siendo el mismo día del calendario.
function fechaDelDia(fecha: string) {
  return new Date(`${fecha}T12:00:00Z`);
}

export async function crearInforme(medicoId: string, data: CrearInformeInput) {
  const historia = await prisma.historiaClinica.findUnique({ where: { pacienteId: data.pacienteId } });
  if (!historia) throw new HttpError(404, "El paciente no tiene historia clínica");

  const numeroInforme = await siguienteNumero("IM");
  return prisma.informeMedico.create({
    data: {
      numeroInforme,
      pacienteId: data.pacienteId,
      historiaClinicaId: historia.id,
      medicoId,
      informe: data.informe,
      indicaciones: data.indicaciones || null,
      ...(data.fecha ? { fecha: fechaDelDia(data.fecha) } : {}),
    },
  });
}

export async function cambiarFechaInforme(id: string, fecha: string) {
  const existe = await prisma.informeMedico.findUnique({ where: { id }, select: { id: true } });
  if (!existe) throw new HttpError(404, "Informe no encontrado");
  return prisma.informeMedico.update({ where: { id }, data: { fecha: fechaDelDia(fecha) } });
}

export async function listarInformesPorPaciente(pacienteId: string) {
  return prisma.informeMedico.findMany({
    where: { pacienteId },
    orderBy: { fecha: "desc" },
    include: { medico: { select: { nombre: true, apellido: true } } },
  });
}

export async function obtenerInformeParaPdf(id: string) {
  const informe = await prisma.informeMedico.findUnique({ where: { id }, include: { paciente: true } });
  if (!informe) throw new HttpError(404, "Informe no encontrado");
  return informe;
}
