import { z } from "zod";

export const tarifaSchema = z.object({
  nombreServicio: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
  precio: z.number().positive(),
  aseguradoraId: z.string().uuid().optional(),
});

export const actualizarTarifaSchema = tarifaSchema.partial().extend({
  descripcion: z.string().trim().nullable().optional(),
  activo: z.boolean().optional(),
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
  detalles: z
    .array(facturaDetalleSchema)
    .min(1)
    .refine((ds) => {
      const citas = ds.map((d) => d.citaId).filter(Boolean);
      return new Set(citas).size === citas.length;
    }, "Una misma cita aparece dos veces en la factura"),
});

export const METODOS_PAGO = ["EFECTIVO", "TARJETA", "SEGURO", "TRANSFERENCIA", "PAGO_MOVIL", "ZELLE", "CASHEA"] as const;

// El monto se registra en dólares. Si se cobró en bolívares se envían
// montoBs y tasaCambio, y el monto en dólares se calcula en el servidor.
export const registrarPagoSchema = z
  .object({
    monto: z.number().positive().optional(),
    metodoPago: z.enum(METODOS_PAGO),
    referencia: z.string().optional(),
    fecha: z.coerce.date().optional(),
    montoBs: z.number().positive().optional(),
    tasaCambio: z.number().positive().optional(),
  })
  .refine((d) => (d.montoBs === undefined) === (d.tasaCambio === undefined), {
    message: "Para un pago en bolívares indica el monto en Bs y la tasa de cambio",
    path: ["tasaCambio"],
  })
  .refine((d) => d.monto !== undefined || d.montoBs !== undefined, {
    message: "Indica el monto del pago",
    path: ["monto"],
  });

export const anularPagoSchema = z.object({
  motivo: z.string().trim().min(3, "Indica el motivo de la anulación"),
});

export type TarifaInput = z.infer<typeof tarifaSchema>;
export type CrearFacturaInput = z.infer<typeof crearFacturaSchema>;
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
export type AnularPagoInput = z.infer<typeof anularPagoSchema>;
