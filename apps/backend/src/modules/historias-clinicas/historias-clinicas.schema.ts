import { z } from "zod";

export const actualizarHistoriaSchema = z.object({
  motivoConsulta: z.string().optional(),
  diagnosticoPrincipal: z.string().optional(),
  codigoCIE10: z.string().optional(),
  antecedentesMedicos: z.string().optional(),
  antecedentesQuirurgicos: z.string().optional(),
  antecedentesFamiliares: z.string().optional(),
  alergias: z.string().optional(),
});

export const crearEvaluacionSchema = z.object({
  tipoEscala: z.enum([
    "BARTHEL",
    "OSWESTRY",
    "GONIOMETRICA",
    "EVA",
    "FUERZA_MUSCULAR",
    "PERSONALIZADA",
  ]),
  nombreEscala: z.string().optional(),
  // Estructura libre: ej. { movimientos: [{articulacion, grados}], dolorEva: 7, ... }
  datos: z.record(z.any()),
  puntajeTotal: z.number().optional(),
  observaciones: z.string().optional(),
  fecha: z.coerce.date().optional(),
});

export type ActualizarHistoriaInput = z.infer<typeof actualizarHistoriaSchema>;
export type CrearEvaluacionInput = z.infer<typeof crearEvaluacionSchema>;
