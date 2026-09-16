import { z } from "zod";

const itemRecetaSchema = z.object({
  // Campos para tipo MEDICAMENTO
  medicamento: z.string().optional(),
  presentacion: z.string().optional(),
  dosis: z.string().optional(),
  frecuencia: z.string().optional(),
  duracion: z.string().optional(),
  // Campos para tipo ORDEN_TERAPIA
  tipoTerapia: z.string().optional(),
  sesiones: z.number().int().positive().optional(),
  observaciones: z.string().optional(),
});

export const crearRecetaSchema = z.object({
  pacienteId: z.string().uuid(),
  tipo: z.enum(["MEDICAMENTO", "ORDEN_TERAPIA"]),
  diagnostico: z.string().optional(),
  indicacionesGenerales: z.string().optional(),
  fechaVencimiento: z.coerce.date().optional(),
  items: z.array(itemRecetaSchema).min(1, "Agrega al menos un ítem a la receta"),
});

export type CrearRecetaInput = z.infer<typeof crearRecetaSchema>;
export type ItemRecetaInput = z.infer<typeof itemRecetaSchema>;
