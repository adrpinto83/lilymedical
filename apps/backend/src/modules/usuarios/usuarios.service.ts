import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";

export type ResultadoEliminacion = "eliminado" | "archivado";

/** Email que libera el original y no puede recibir correo (dominio .invalid). */
export function emailArchivado(id: string) {
  return `eliminado-${id}@usuarios.lilymedical.invalid`;
}

/**
 * Elimina a un miembro del personal.
 *
 * Si no tiene historial se borra de verdad. Si lo tiene (citas, sesiones,
 * récipes, pagos, accesos...), borrarlo rompería o falsearía esos registros,
 * así que se da de baja lógica: sin acceso, fuera de la lista y con el email
 * libre para volver a usarlo.
 */
export async function eliminarUsuario(id: string, solicitanteId: string): Promise<ResultadoEliminacion> {
  if (id === solicitanteId) throw new HttpError(400, "No puedes eliminar tu propia cuenta");

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario || usuario.eliminadoEn || usuario.rol === "PACIENTE") {
    throw new HttpError(404, "Usuario no encontrado");
  }
  if (usuario.rol === "ADMIN") {
    throw new HttpError(403, "El administrador del sistema no se puede eliminar");
  }

  try {
    await prisma.usuario.delete({ where: { id } });
    return "eliminado";
  } catch (err) {
    // P2003: otra tabla lo referencia (tiene historial).
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2003") throw err;
  }

  await prisma.usuario.update({
    where: { id },
    data: {
      activo: false,
      eliminadoEn: new Date(),
      email: emailArchivado(id),
      // Hash imposible: ninguna contraseña coincide con él.
      passwordHash: "!",
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });
  return "archivado";
}
