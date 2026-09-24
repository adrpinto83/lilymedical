import { z } from "zod";

export const tarifaSchema = z.object({
  nombreServicio: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().positive(),
  aseguradoraId: z.string().uuid().optional(),
});

export const facturaDetalleSchema = z.object({
  tarifaId: z.string().uuid(),
  citaId: z.string().uuid().optional(),
  sesionId: z.string().uuid().optional(),
  descripcion: z.string().optional(),
  cantidad: z.number().int().positive().default(1),
});

export const crearFacturaSchema = z.object({
  pacienteId: z.string().uuid(),
  aseguradoraId: z.string().uuid().optional(),
  // Opcional: si la aseguradora exige autorización y no se indica, se usa
  // la aprobada y vigente con cupo que venza primero.
  autorizacionId: z.string().uuid().optional(),
  impuestos: z.number().min(0).default(0),
  notas: z.string().optional(),
  detalles: z.array(facturaDetalleSchema).min(1),
});

export const registrarPagoSchema = z.object({
  monto: z.number().positive(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "SEGURO", "TRANSFERENCIA"]),
  referencia: z.string().optional(),
  fecha: z.coerce.date().optional(),
});

export const anularPagoSchema = z.object({
  motivo: z.string().trim().min(3, "Indica el motivo de la anulación"),
});

export type TarifaInput = z.infer<typeof tarifaSchema>;
export type CrearFacturaInput = z.infer<typeof crearFacturaSchema>;
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
export type AnularPagoInput = z.infer<typeof anularPagoSchema>;
