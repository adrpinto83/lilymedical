import fs from "fs/promises";
import path from "path";
import { FotoGaleria } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { ActualizarFotoInput } from "./galeria.schema";

export const galeriaDir = path.resolve(
  process.cwd(),
  process.env.UPLOADS_DIR || "uploads",
  "galeria"
);

/** Ruta pública del archivo, la que consume el <img> de la landing. */
export const RUTA_PUBLICA = "/uploads/galeria";

export interface FotoPublica {
  id: string;
  url: string;
  pie: string;
}

/**
 * "01-terapia-de-hombro.jpg" -> "Terapia de hombro".
 *
 * Misma convención que la carpeta `src/assets/galeria/` del frontend, para que
 * subir una foto ya nombrada dé un pie decente sin escribir nada.
 */
export function pieDesdeNombre(nombreOriginal: string): string {
  const texto = nombreOriginal
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[._-]+/g, " ")
    .trim();
  if (!texto) return "Fotografía del consultorio";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Traduce una lista de ids en el orden deseado a los `orden` a guardar. */
export function posicionesDeOrden(ids: string[]): Array<{ id: string; orden: number }> {
  return ids.map((id, indice) => ({ id, orden: indice }));
}

function aPublica(foto: FotoGaleria): FotoPublica {
  return { id: foto.id, url: `${RUTA_PUBLICA}/${foto.archivo}`, pie: foto.pie };
}

export async function listarPublicas(): Promise<FotoPublica[]> {
  const fotos = await prisma.fotoGaleria.findMany({
    where: { visible: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  return fotos.map(aPublica);
}

export async function listarTodas() {
  const fotos = await prisma.fotoGaleria.findMany({
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  return fotos.map((foto) => ({ ...foto, url: `${RUTA_PUBLICA}/${foto.archivo}` }));
}

export async function crearFoto(datos: {
  archivo: string;
  nombreOriginal: string;
  pie?: string;
  subidoPorId: string;
}) {
  // Se añade al final: el máximo actual + 1.
  const ultima = await prisma.fotoGaleria.findFirst({ orderBy: { orden: "desc" } });
  const foto = await prisma.fotoGaleria.create({
    data: {
      archivo: datos.archivo,
      nombreOriginal: datos.nombreOriginal,
      pie: datos.pie?.trim() || pieDesdeNombre(datos.nombreOriginal),
      orden: (ultima?.orden ?? -1) + 1,
      subidoPorId: datos.subidoPorId,
    },
  });
  return { ...foto, url: `${RUTA_PUBLICA}/${foto.archivo}` };
}

export async function actualizarFoto(id: string, datos: ActualizarFotoInput) {
  const foto = await prisma.fotoGaleria.update({ where: { id }, data: datos });
  return { ...foto, url: `${RUTA_PUBLICA}/${foto.archivo}` };
}

export async function reordenar(ids: string[]) {
  const existentes = await prisma.fotoGaleria.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (existentes.length !== ids.length) {
    throw new HttpError(400, "La lista de orden no coincide con las fotos existentes");
  }
  await prisma.$transaction(
    posicionesDeOrden(ids).map(({ id, orden }) =>
      prisma.fotoGaleria.update({ where: { id }, data: { orden } })
    )
  );
  return listarTodas();
}

export async function eliminarFoto(id: string) {
  const foto = await prisma.fotoGaleria.findUnique({ where: { id } });
  if (!foto) throw new HttpError(404, "Foto no encontrada");

  await prisma.fotoGaleria.delete({ where: { id } });
  // El registro manda: si el archivo ya no está, borrarlo no debe fallar.
  await fs.unlink(path.join(galeriaDir, foto.archivo)).catch(() => undefined);
}
