import { z } from "zod";

export const crearConstanciaSchema = z.object({
  pacienteId: z.string().uuid(),
  diagnostico: z.string().optional(),
  codigoCIE10: z.string().optional(),
  diasReposo: z.number().int().positive().optional(),
  fechaInicioReposo: z.coerce.date().optional(),
  fechaFinReposo: z.coerce.date().optional(),
  motivo: z.string().min(1, "Describe el motivo de la constancia"),
});

export type CrearConstanciaInput = z.infer<typeof crearConstanciaSchema>;
