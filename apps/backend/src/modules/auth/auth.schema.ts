import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  rol: z.enum(["MEDICO", "ADMINISTRATIVO", "PACIENTE"]),
  especialidad: z.string().optional(),
});

// Alta del portal del paciente: el paciente ya debe existir como ficha
// clínica (creada por el consultorio) y el email debe coincidir con el que
// el consultorio tiene registrado, para evitar que cualquiera con la
// cédula de otra persona pueda crearse una cuenta.
export const registroPacienteSchema = z.object({
  documento: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegistroPacienteInput = z.infer<typeof registroPacienteSchema>;
