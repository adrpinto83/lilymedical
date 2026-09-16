import { z } from "zod";

export const crearAutorizacionSchema = z.object({
  pacienteId: z.string().uuid(),
  aseguradoraId: z.string().uuid(),
  numeroAutorizacion: z.string().optional(),
  sesionesAutorizadas: z.number().int().positive().optional(),
  vigenciaHasta: z.coerce.date().optional(),
  notas: z.string().optional(),
});

export const actualizarAutorizacionSchema = z.object({
  numeroAutorizacion: z.string().optional(),
  sesionesAutorizadas: z.number().int().positive().optional(),
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).optional(),
  vigenciaHasta: z.coerce.date().optional(),
  notas: z.string().optional(),
});

export type CrearAutorizacionInput = z.infer<typeof crearAutorizacionSchema>;
export type ActualizarAutorizacionInput = z.infer<typeof actualizarAutorizacionSchema>;
