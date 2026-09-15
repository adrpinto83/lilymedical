import { PrismaClient, Prisma } from "@prisma/client";
import { encryptField, decryptField } from "./encryption";

// Campos con datos clínicos sensibles que se cifran en reposo (AES-256-GCM)
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  historiaClinica: [
    "motivoConsulta",
    "diagnosticoPrincipal",
    "antecedentesMedicos",
    "antecedentesQuirurgicos",
    "antecedentesFamiliares",
  ],
  sesion: ["notaEvolucion", "tratamientoAplicado"],
  receta: ["diagnostico", "indicacionesGenerales"],
  constanciaMedica: ["diagnostico", "motivo"],
};

function encryptArgsData(model: string, data: any) {
  const fields = ENCRYPTED_FIELDS[model];
  if (!data || !fields) return;
  for (const field of fields) {
    if (typeof data[field] === "string" && data[field].length > 0) {
      data[field] = encryptField(data[field]);
    }
  }
}

function decryptResultFields(model: string, result: any) {
  const fields = ENCRYPTED_FIELDS[model];
  if (!result || !fields) return result;
  const items = Array.isArray(result) ? result : [result];
  for (const item of items) {
    if (!item) continue;
    for (const field of fields) {
      if (typeof item[field] === "string" && item[field].length > 0) {
        try {
          item[field] = decryptField(item[field]);
        } catch {
          // deja el valor tal cual si no se puede descifrar (dato legado sin cifrar)
        }
      }
    }
  }
  return result;
}

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const modelKey = model.charAt(0).toLowerCase() + model.slice(1);

        if (ENCRYPTED_FIELDS[modelKey]) {
          if (operation === "create" || operation === "update" || operation === "upsert") {
            const a = args as any;
            if (a.data) encryptArgsData(modelKey, a.data);
            if (a.create) encryptArgsData(modelKey, a.create);
            if (a.update) encryptArgsData(modelKey, a.update);
          }
        }

        const result = await query(args);

        if (ENCRYPTED_FIELDS[modelKey]) {
          decryptResultFields(modelKey, result);
        }

        return result;
      },
    },
  },
}) as unknown as PrismaClient;

export type { Prisma };
