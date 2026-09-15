import { prisma } from "../../lib/prisma";
import { Membrete } from "../../lib/pdf";
import { ActualizarPerfilMedicoInput } from "./perfil-medico.schema";
import path from "path";

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR || "uploads");

export async function obtenerOCrearPerfil(usuarioId: string) {
  let perfil = await prisma.perfilMedico.findUnique({ where: { usuarioId } });
  if (!perfil) {
    perfil = await prisma.perfilMedico.create({ data: { usuarioId } });
  }
  return perfil;
}

export async function actualizarPerfil(usuarioId: string, data: ActualizarPerfilMedicoInput) {
  await obtenerOCrearPerfil(usuarioId);
  return prisma.perfilMedico.update({ where: { usuarioId }, data });
}

export async function actualizarFirma(usuarioId: string, firmaUrl: string) {
  await obtenerOCrearPerfil(usuarioId);
  return prisma.perfilMedico.update({ where: { usuarioId }, data: { firmaUrl } });
}

// Arma el objeto de membrete que usan los generadores de PDF a partir del
// perfil del médico que emite el documento.
export async function construirMembrete(medicoId: string): Promise<Membrete> {
  const [perfil, medico] = await Promise.all([
    obtenerOCrearPerfil(medicoId),
    prisma.usuario.findUniqueOrThrow({ where: { id: medicoId } }),
  ]);

  return {
    medicoNombre: medico.nombre,
    medicoApellido: medico.apellido,
    direccionConsultorio: perfil.direccionConsultorio,
    telefonoConsultorio: perfil.telefonoConsultorio,
    colegiatura: perfil.colegiatura,
    cma: perfil.cma,
    rif: perfil.rif,
    instagram: perfil.instagram,
    email: medico.email,
    tituloProfesional: perfil.tituloProfesional ?? medico.especialidad,
    firmaPath: perfil.firmaUrl ? path.join(uploadsDir, "firmas", perfil.firmaUrl) : null,
  };
}
