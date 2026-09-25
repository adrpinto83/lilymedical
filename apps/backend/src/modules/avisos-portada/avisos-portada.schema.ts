import { z } from "zod";

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

// Solo enlaces web, anclas de la propia portada o rutas internas: nada de
// "javascript:" ni otros esquemas en un botón que ve cualquier visitante.
const enlace = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(https?:\/\/|#|\/)/i.test(v), {
    message: "El enlace debe empezar por https://, # o /",
  })
  .transform((v) => v || null)
  .nullable()
  .optional();

export const avisoSchema = z.object({
  etiqueta: textoOpcional(60),
  titulo: z.string().trim().min(1).max(120),
  mensaje: z.string().trim().min(1).max(2000),
  firma: textoOpcional(80),
  textoBoton: z.string().trim().min(1).max(40).optional(),
  enlaceUrl: enlace,
  enlaceTexto: textoOpcional(40),
});

export const activarSchema = z.object({
  activo: z.boolean(),
});

export type AvisoInput = z.infer<typeof avisoSchema>;
