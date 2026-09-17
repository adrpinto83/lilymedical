import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { ActualizarMiPerfilInput } from "./portal-paciente.schema";

// Nunca se confía en un pacienteId que venga del cliente: siempre se resuelve
// a partir del usuario autenticado (el login), para que un paciente jamás
// pueda pedir datos de otro con solo cambiar un id en la URL.
export async function resolverMiPacienteId(usuarioId: string): Promise<string> {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario?.pacienteId) {
    throw new HttpError(403, "Esta cuenta no está vinculada a una ficha de paciente");
  }
  return usuario.pacienteId;
}

export async function obtenerMiPerfil(usuarioId: string) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  return prisma.paciente.findUniqueOrThrow({
    where: { id: pacienteId },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      documento: true,
      fechaNacimiento: true,
      sexo: true,
      telefono: true,
      email: true,
      direccion: true,
      contactoEmergenciaNombre: true,
      contactoEmergenciaTelefono: true,
    },
  });
}

// Solo datos de contacto: identidad, fecha de nacimiento y datos clínicos
// siguen siendo responsabilidad exclusiva del consultorio.
export async function actualizarMiPerfil(usuarioId: string, data: ActualizarMiPerfilInput) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  return prisma.paciente.update({ where: { id: pacienteId }, data });
}

// Resumen clínico mínimo pensado para el paciente (no la historia completa:
// notas de evolución/evaluaciones quedan solo para el personal médico).
export async function obtenerMiResumenClinico(usuarioId: string) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  const historia = await prisma.historiaClinica.findUnique({
    where: { pacienteId },
    select: { motivoConsulta: true, diagnosticoPrincipal: true, codigoCIE10: true, alergias: true },
  });
  return historia;
}

export async function misCitas(usuarioId: string) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  return prisma.cita.findMany({
    where: { pacienteId },
    orderBy: { fechaHoraInicio: "desc" },
    include: { profesional: { select: { nombre: true, apellido: true } } },
  });
}

export async function misDocumentos(usuarioId: string) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  const [recetas, constancias, planesEjercicios] = await Promise.all([
    prisma.receta.findMany({
      where: { pacienteId },
      orderBy: { fecha: "desc" },
      include: { medico: { select: { nombre: true, apellido: true } } },
    }),
    prisma.constanciaMedica.findMany({
      where: { pacienteId },
      orderBy: { fecha: "desc" },
      include: { medico: { select: { nombre: true, apellido: true } } },
    }),
    prisma.planEjercicios.findMany({
      where: { pacienteId },
      orderBy: { fecha: "desc" },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
  ]);
  return { recetas, constancias, planesEjercicios };
}

// Las tres funciones siguientes verifican pertenencia antes de entregar los
// datos para el PDF; se usa 404 (no 403) tanto si el documento no existe
// como si es de otro paciente, para no revelar por respuesta si un id
// ajeno corresponde a un documento real.
export async function obtenerMiRecetaParaPdf(usuarioId: string, recetaId: string) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  const receta = await prisma.receta.findUnique({
    where: { id: recetaId },
    include: {
      items: { orderBy: { orden: "asc" } },
      paciente: true,
      historiaClinica: { select: { alergias: true } },
    },
  });
  if (!receta || receta.pacienteId !== pacienteId) throw new HttpError(404, "Receta no encontrada");
  return receta;
}

export async function obtenerMiConstanciaParaPdf(usuarioId: string, constanciaId: string) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  const constancia = await prisma.constanciaMedica.findUnique({
    where: { id: constanciaId },
    include: { paciente: true },
  });
  if (!constancia || constancia.pacienteId !== pacienteId) {
    throw new HttpError(404, "Constancia no encontrada");
  }
  return constancia;
}

export async function obtenerMiPlanParaPdf(usuarioId: string, planId: string) {
  const pacienteId = await resolverMiPacienteId(usuarioId);
  const plan = await prisma.planEjercicios.findUnique({
    where: { id: planId },
    include: { items: { orderBy: { orden: "asc" } }, paciente: true },
  });
  if (!plan || plan.pacienteId !== pacienteId) throw new HttpError(404, "Plan de ejercicios no encontrado");
  return plan;
}
