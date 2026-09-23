import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { HttpError } from "../lib/http-error";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Datos inválidos",
      detalles: err.flatten().fieldErrors,
    });
  }

  // Multer lanza sus propios errores al subir archivos (tamaño excedido,
  // campo inesperado). Sin esto caían en el 500 genérico y el usuario no
  // llegaba a saber que su archivo pesaba de más.
  if (err instanceof MulterError) {
    const mensaje =
      err.code === "LIMIT_FILE_SIZE"
        ? "El archivo supera el tamaño máximo permitido"
        : `No se pudo procesar el archivo: ${err.message}`;
    return res.status(400).json({ error: mensaje });
  }

  // Errores de restricción única de Prisma, etc.
  if (err && typeof err === "object" && "code" in err) {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        error: `Ya existe un registro con ese valor en: ${prismaErr.meta?.target?.join(", ")}`,
      });
    }
    if (prismaErr.code === "P2025") {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
