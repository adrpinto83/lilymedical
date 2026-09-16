import { z } from "zod";

export const crearPacienteSchema = z.object({
  nombres: z.string().min(1),
  apellidos: z.string().min(1),
  documento: z.string().min(1),
  fechaNacimiento: z.coerce.date(),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"]),
  telefono: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  direccion: z.string().optional(),
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
});

export const actualizarPacienteSchema = crearPacienteSchema.partial();

export const pacienteAseguradoraSchema = z.object({
  aseguradoraId: z.string().uuid(),
  numeroAfiliacion: z.string().optional(),
  esPrimaria: z.boolean().optional(),
});

export type CrearPacienteInput = z.infer<typeof crearPacienteSchema>;
export type ActualizarPacienteInput = z.infer<typeof actualizarPacienteSchema>;
export type PacienteAseguradoraInput = z.infer<typeof pacienteAseguradoraSchema>;
