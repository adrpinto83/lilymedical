import { z } from "zod";

export const crearInformeSchema = z.object({
  pacienteId: z.string().uuid(),
  informe: z.string().trim().min(1, "Escribe el informe"),
  indicaciones: z.string().trim().optional(),
});

export type CrearInformeInput = z.infer<typeof crearInformeSchema>;
