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
  rol: z.enum(["ADMIN", "MEDICO", "ADMINISTRATIVO", "FISIATRA_AYUDANTE", "PACIENTE"]),
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

// Las contraseñas nuevas se exigen más largas que el mínimo histórico de
// login (6), que se mantiene para no invalidar credenciales ya existentes.
export const cambiarPasswordSchema = z.object({
  actual: z.string().min(1, "Indica tu contraseña actual"),
  nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegistroPacienteInput = z.infer<typeof registroPacienteSchema>;
