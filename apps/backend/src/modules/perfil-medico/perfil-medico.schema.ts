import { z } from "zod";

export const actualizarPerfilMedicoSchema = z.object({
  colegiatura: z.string().optional(),
  cma: z.string().optional(),
  rif: z.string().optional(),
  instagram: z.string().optional(),
  tituloProfesional: z.string().optional(),
  nombreConsultorio: z.string().min(1).optional(),
  direccionConsultorio: z.string().optional(),
  telefonoConsultorio: z.string().optional(),
});

export type ActualizarPerfilMedicoInput = z.infer<typeof actualizarPerfilMedicoSchema>;
