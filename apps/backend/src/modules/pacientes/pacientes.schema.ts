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
  aseguradoraId: z.string().uuid().optional(),
  numeroAfiliacion: z.string().optional(),
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
});

export const actualizarPacienteSchema = crearPacienteSchema.partial();

export type CrearPacienteInput = z.infer<typeof crearPacienteSchema>;
export type ActualizarPacienteInput = z.infer<typeof actualizarPacienteSchema>;
