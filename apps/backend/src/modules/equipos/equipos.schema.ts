import { z } from "zod";

const fechaOpcional = z.coerce.date().optional().nullable();

export const equipoSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().optional().nullable(),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  numeroSerie: z.string().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  fechaAdquisicion: fechaOpcional,
  garantiaHasta: fechaOpcional,
  proveedorServicio: z.string().optional().nullable(),
  estado: z.enum(["OPERATIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO", "DADO_DE_BAJA"]).optional(),
  frecuenciaMantenimientoDias: z.number().int().positive().optional().nullable(),
  ultimoMantenimiento: fechaOpcional,
  proximoMantenimiento: fechaOpcional,
  notas: z.string().optional().nullable(),
});

export const mantenimientoSchema = z.object({
  tipo: z.enum(["PREVENTIVO", "CORRECTIVO", "CALIBRACION"]),
  fecha: z.coerce.date(),
  descripcion: z.string().min(1),
  realizadoPor: z.string().optional().nullable(),
  costo: z.number().nonnegative().optional().nullable(),
  estadoResultante: z
    .enum(["OPERATIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO", "DADO_DE_BAJA"])
    .default("OPERATIVO"),
});

export type EquipoInput = z.infer<typeof equipoSchema>;
export type MantenimientoInput = z.infer<typeof mantenimientoSchema>;
