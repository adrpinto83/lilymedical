import { z } from "zod";

const itemPlanEjercicioSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  repeticionesSugeridas: z.string().optional(),
});

export const crearPlanEjerciciosSchema = z.object({
  notas: z.string().optional(),
  items: z.array(itemPlanEjercicioSchema).min(1, "Agrega al menos un ejercicio al plan"),
});

export type CrearPlanEjerciciosInput = z.infer<typeof crearPlanEjerciciosSchema>;
