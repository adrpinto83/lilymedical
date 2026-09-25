import { z } from "zod";

// El médico dueño del consultorio crea las cuentas del personal. No se permite crear
// cuentas PACIENTE desde aquí: esas nacen del portal, atadas a una ficha
// clínica existente (ver auth.service.registrarPaciente).
export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["ADMIN", "MEDICO", "ADMINISTRATIVO", "FISIATRA_AYUDANTE"]),
  especialidad: z.string().optional(),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  especialidad: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

export const reiniciarPasswordSchema = z.object({
  nueva: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
