import { z } from "zod";

export const crearSesionSchema = z.object({
  pacienteId: z.string().uuid(),
  citaId: z.string().uuid().optional(),
  notaEvolucion: z.string().min(1),
  tratamientoAplicado: z.string().optional(),
  asistencia: z.enum(["ASISTIO", "INASISTIO", "CANCELO"]).default("ASISTIO"),
  fecha: z.coerce.date().optional(),
});

// El vínculo con la cita se fija al crear la sesión y no se reasigna.
export const actualizarSesionSchema = crearSesionSchema
  .omit({ pacienteId: true, citaId: true })
  .partial();

export type CrearSesionInput = z.infer<typeof crearSesionSchema>;
export type ActualizarSesionInput = z.infer<typeof actualizarSesionSchema>;
