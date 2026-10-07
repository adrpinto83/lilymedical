import { z } from "zod";

// Fecha que sale en el informe (AAAA-MM-DD). La dra. puede ponerle otra
// distinta a la de hoy, p. ej. si el informe corresponde a una consulta previa.
const fechaInforme = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const crearInformeSchema = z.object({
  pacienteId: z.string().uuid(),
  informe: z.string().trim().min(1, "Escribe el informe"),
  indicaciones: z.string().trim().optional(),
  fecha: fechaInforme.optional(),
});

export const cambiarFechaInformeSchema = z.object({ fecha: fechaInforme });

export type CrearInformeInput = z.infer<typeof crearInformeSchema>;
