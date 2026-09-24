import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

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
