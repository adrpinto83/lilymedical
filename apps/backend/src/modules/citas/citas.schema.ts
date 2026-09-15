import { z } from "zod";

export const crearCitaSchema = z.object({
  pacienteId: z.string().uuid(),
  profesionalId: z.string().uuid(),
  tarifaId: z.string().uuid().optional(),
  fechaHoraInicio: z.coerce.date(),
  fechaHoraFin: z.coerce.date(),
  notas: z.string().optional(),
});

// Programa un paquete de sesiones recurrentes, ej. 10 sesiones, 3x/semana
export const crearCitasRecurrentesSchema = z.object({
  pacienteId: z.string().uuid(),
  profesionalId: z.string().uuid(),
  tarifaId: z.string().uuid().optional(),
  fechaHoraInicio: z.coerce.date(), // fecha/hora de la primera sesión
  duracionMinutos: z.number().int().positive().default(45),
  totalSesiones: z.number().int().positive().max(100),
  diasSemana: z.array(z.number().int().min(0).max(6)).min(1), // 0=domingo ... 6=sábado
  notas: z.string().optional(),
});

export const actualizarCitaSchema = z.object({
  fechaHoraInicio: z.coerce.date().optional(),
  fechaHoraFin: z.coerce.date().optional(),
  estado: z
    .enum(["PROGRAMADA", "CONFIRMADA", "ATENDIDA", "CANCELADA", "NO_ASISTIO"])
    .optional(),
  tarifaId: z.string().uuid().optional(),
  notas: z.string().optional(),
});

export const crearBloqueoSchema = z.object({
  profesionalId: z.string().uuid(),
  fechaHoraInicio: z.coerce.date(),
  fechaHoraFin: z.coerce.date(),
  motivo: z.string().optional(),
});

export type CrearCitaInput = z.infer<typeof crearCitaSchema>;
export type CrearCitasRecurrentesInput = z.infer<typeof crearCitasRecurrentesSchema>;
export type ActualizarCitaInput = z.infer<typeof actualizarCitaSchema>;
export type CrearBloqueoInput = z.infer<typeof crearBloqueoSchema>;
