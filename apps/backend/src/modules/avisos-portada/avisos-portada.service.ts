import { AvisoPortada, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { AvisoInput } from "./avisos-portada.schema";

export type AvisoPublico = Pick<
  AvisoPortada,
  | "id"
  | "tipo"
  | "etiqueta"
  | "titulo"
  | "mensaje"
  | "firma"
  | "textoBoton"
  | "enlaceUrl"
  | "enlaceTexto"
  | "updatedAt"
>;

/** La dedicatoria es un registro histórico: se enciende o apaga, nada más. */
export function asegurarEditable(aviso: Pick<AvisoPortada, "tipo">) {
  if (aviso.tipo === "DEDICATORIA") {
    throw new HttpError(409, "La dedicatoria se conserva como histórico y no se puede modificar ni eliminar");
  }
}

async function buscar(id: string) {
  const aviso = await prisma.avisoPortada.findUnique({ where: { id } });
  if (!aviso) throw new HttpError(404, "Aviso no encontrado");
  return aviso;
}

export async function obtenerActivo(): Promise<AvisoPublico | null> {
  return prisma.avisoPortada.findFirst({
    where: { activo: true },
    select: {
      id: true,
      tipo: true,
      etiqueta: true,
      titulo: true,
      mensaje: true,
      firma: true,
      textoBoton: true,
      enlaceUrl: true,
      enlaceTexto: true,
      updatedAt: true,
    },
  });
}

export async function listar() {
  return prisma.avisoPortada.findMany({
    orderBy: [{ activo: "desc" }, { createdAt: "desc" }],
  });
}

export async function crear(datos: AvisoInput) {
  return prisma.avisoPortada.create({ data: { ...datos, tipo: "COMERCIAL" } });
}

export async function actualizar(id: string, datos: AvisoInput) {
  asegurarEditable(await buscar(id));
  return prisma.avisoPortada.update({ where: { id }, data: datos });
}

/** Activar uno apaga los demás: la portada muestra un solo aviso. */
export async function cambiarActivo(id: string, activo: boolean) {
  await buscar(id);
  const operaciones: Prisma.PrismaPromise<unknown>[] = [];
  if (activo) {
    operaciones.push(
      prisma.avisoPortada.updateMany({ where: { activo: true, id: { not: id } }, data: { activo: false } })
    );
  }
  operaciones.push(prisma.avisoPortada.update({ where: { id }, data: { activo } }));
  await prisma.$transaction(operaciones);
  return listar();
}

export async function eliminar(id: string) {
  asegurarEditable(await buscar(id));
  await prisma.avisoPortada.delete({ where: { id } });
}
