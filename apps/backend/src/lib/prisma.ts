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
    "alergias",
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

// Nombres de campo cifrados, sin importar a qué modelo pertenecen. Un `include`
// anidado (ej. receta.findUnique({ include: { historiaClinica } })) llega en el
// mismo resultado que el modelo de nivel superior, así que el descifrado debe
// recorrer todo el árbol del resultado, no solo las columnas del modelo raíz.
const ALL_ENCRYPTED_FIELD_NAMES = new Set(Object.values(ENCRYPTED_FIELDS).flat());

function decryptDeep(value: any, depth = 0): any {
  if (value === null || value === undefined || depth > 6) return value;
  if (Array.isArray(value)) {
    for (const item of value) decryptDeep(item, depth + 1);
    return value;
  }
  if (value instanceof Date || typeof value !== "object") return value;

  for (const key of Object.keys(value)) {
    const v = value[key];
    if (ALL_ENCRYPTED_FIELD_NAMES.has(key) && typeof v === "string" && v.length > 0) {
      try {
        value[key] = decryptField(v);
      } catch {
        // deja el valor tal cual si no se puede descifrar (dato legado sin cifrar)
      }
    } else if (v && typeof v === "object") {
      decryptDeep(v, depth + 1);
    }
  }
  return value;
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

        decryptDeep(result);

        return result;
      },
    },
  },
}) as unknown as PrismaClient;

export type { Prisma };
