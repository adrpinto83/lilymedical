import { z } from "zod";

export const actualizarFotoSchema = z.object({
  pie: z.string().min(1).max(200).optional(),
  visible: z.boolean().optional(),
});

export const reordenarSchema = z.object({
  // Lista completa de ids en el orden deseado.
  ids: z.array(z.string().uuid()).min(1),
});

export type ActualizarFotoInput = z.infer<typeof actualizarFotoSchema>;
export type ReordenarInput = z.infer<typeof reordenarSchema>;
