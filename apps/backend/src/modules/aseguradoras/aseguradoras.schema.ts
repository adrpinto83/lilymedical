import { z } from "zod";

export const aseguradoraSchema = z.object({
  nombre: z.string().min(1),
  tipoConvenio: z.string().optional(),
  condiciones: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoTelefono: z.string().optional(),
  porcentajeCobertura: z.number().min(0).max(100).optional(),
  requiereAutorizacion: z.boolean().optional(),
  topeMontoPorSesion: z.number().positive().optional(),
});

export type AseguradoraInput = z.infer<typeof aseguradoraSchema>;
