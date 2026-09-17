import { z } from "zod";

export const actualizarMiPerfilSchema = z.object({
  telefono: z.string().min(1).optional(),
  direccion: z.string().optional(),
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
});

export type ActualizarMiPerfilInput = z.infer<typeof actualizarMiPerfilSchema>;
