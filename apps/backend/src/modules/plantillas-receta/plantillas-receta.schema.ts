import { z } from "zod";

export const crearPlantillaRecetaSchema = z.object({
  tipo: z.enum(["MEDICAMENTO", "ORDEN_TERAPIA"]),
  medicamento: z.string().optional(),
  presentacion: z.string().optional(),
  dosis: z.string().optional(),
  frecuencia: z.string().optional(),
  duracion: z.string().optional(),
  tipoTerapia: z.string().optional(),
  sesiones: z.number().int().positive().optional(),
  observaciones: z.string().optional(),
});

export type CrearPlantillaRecetaInput = z.infer<typeof crearPlantillaRecetaSchema>;
