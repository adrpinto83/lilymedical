import { z } from "zod";

export const presupuestoItemSchema = z.object({
  tarifaId: z.string().uuid().optional(),
  descripcion: z.string().trim().min(1, "Describe el servicio"),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().nonnegative(),
});

export const crearPresupuestoSchema = z.object({
  pacienteId: z.string().uuid(),
  diagnostico: z.string().trim().optional(),
  // Bs por dólar (tasa BCV del día); sin tasa el presupuesto sale solo en $.
  tasaCambio: z.number().positive().optional(),
  notas: z.string().trim().optional(),
  items: z.array(presupuestoItemSchema).min(1, "Agrega al menos un servicio"),
});

export type CrearPresupuestoInput = z.infer<typeof crearPresupuestoSchema>;
