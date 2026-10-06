import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "./http-error";

type Cliente = PrismaClient | Prisma.TransactionClient;

// Devuelve el siguiente número de documento de la serie, ej. "LM-2026-00042".
// El INSERT ... ON CONFLICT DO UPDATE es una sola sentencia atómica en
// Postgres: dos emisiones simultáneas nunca obtienen el mismo número (antes
// se calculaba con count() + 1 y la segunda chocaba con el unique).
// Se puede pasar el cliente de una transacción para que el número solo se
// consuma si el documento llega a crearse.
export async function siguienteNumero(prefijo: string, cliente: Cliente = prisma): Promise<string> {
  const serie = `${prefijo}-${new Date().getFullYear()}`;
  const [{ valor }] = await cliente.$queryRaw<{ valor: number }[]>`
    INSERT INTO correlativos (serie, valor) VALUES (${serie}, 1)
    ON CONFLICT (serie) DO UPDATE SET valor = correlativos.valor + 1
    RETURNING valor`;
  return `${serie}-${String(valor).padStart(5, "0")}`;
}

// Series que el médico puede ajustar (ej. para seguir la numeración del
// talonario en papel), con la tabla y columna donde quedan sus números.
const SERIES = {
  PR: { nombre: "Presupuestos", tabla: "presupuestos", columna: "numeroPresupuesto" },
  LM: { nombre: "Facturas", tabla: "facturas", columna: "numeroFactura" },
  RX: { nombre: "Recetas y órdenes de terapia", tabla: "recetas", columna: "numeroReceta" },
  IM: { nombre: "Informes médicos", tabla: "informes_medicos", columna: "numeroInforme" },
  CM: { nombre: "Constancias", tabla: "constancias_medicas", columna: "numeroConstancia" },
} as const;

type PrefijoSerie = keyof typeof SERIES;
const MAXIMO = 99999;

async function estadoSerie(prefijo: PrefijoSerie) {
  const { nombre, tabla, columna } = SERIES[prefijo];
  const serie = `${prefijo}-${new Date().getFullYear()}`;
  // El correlativo va con 5 dígitos, así que el mayor en texto es el mayor número.
  // Tabla y columna salen de SERIES (no del usuario): es seguro interpolarlas.
  const [correlativo, [ultimo]] = await Promise.all([
    prisma.correlativo.findUnique({ where: { serie } }),
    prisma.$queryRawUnsafe<{ numero: string | null }[]>(
      `SELECT max("${columna}") AS numero FROM "${tabla}" WHERE "${columna}" LIKE $1`,
      `${serie}-%`
    ),
  ]);
  const ultimoUsado = ultimo?.numero ? Number(ultimo.numero.split("-").pop()) : 0;
  return {
    prefijo,
    nombre,
    serie,
    siguiente: Math.max(correlativo?.valor ?? 0, ultimoUsado) + 1,
    // No se puede volver a un número ya emitido: saldría repetido.
    minimo: ultimoUsado + 1,
  };
}

export function listarNumeracion() {
  return Promise.all((Object.keys(SERIES) as PrefijoSerie[]).map(estadoSerie));
}

/** El próximo documento de la serie (del año en curso) saldrá con `siguiente`. */
export async function fijarSiguienteNumero(prefijo: string, siguiente: number) {
  if (!(prefijo in SERIES)) throw new HttpError(404, "Serie de documentos desconocida");
  const estado = await estadoSerie(prefijo as PrefijoSerie);
  if (!Number.isInteger(siguiente) || siguiente < estado.minimo || siguiente > MAXIMO) {
    throw new HttpError(
      400,
      estado.minimo > 1
        ? `El número debe estar entre ${estado.minimo} y ${MAXIMO}: hasta el ${estado.minimo - 1} ya se emitieron.`
        : `El número debe estar entre 1 y ${MAXIMO}.`
    );
  }
  await prisma.correlativo.upsert({
    where: { serie: estado.serie },
    create: { serie: estado.serie, valor: siguiente - 1 },
    update: { valor: siguiente - 1 },
  });
  return estadoSerie(prefijo as PrefijoSerie);
}
