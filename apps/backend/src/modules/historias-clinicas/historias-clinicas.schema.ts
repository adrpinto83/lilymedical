import { z } from "zod";

export const actualizarHistoriaSchema = z.object({
  // "" deja la fecha vacía desde el formulario.
  // (null va primero: z.coerce.date() convertiría null en 1970-01-01.)
  fechaConsulta: z.union([z.null(), z.literal("").transform(() => null), z.coerce.date()]).optional(),
  motivoConsulta: z.string().optional(),
  enfermedadActual: z.string().optional(),
  estudiosComplementarios: z.string().optional(),
  diagnosticoPrincipal: z.string().optional(),
  codigoCIE10: z.string().optional(),
  antecedentesMedicos: z.string().optional(),
  antecedentesQuirurgicos: z.string().optional(),
  antecedentesFamiliares: z.string().optional(),
  alergias: z.string().optional(),
  ocupacion: z.string().optional(),
  dominancia: z.enum(["DIESTRO", "ZURDO", "AMBIDIESTRO", ""]).optional(),
  actividadFisica: z.string().optional(),
  contraindicaciones: z.string().optional(),
  examenFisico: z.string().optional(),
  objetivosRehabilitacion: z.string().optional(),
  planTerapeutico: z.string().optional(),
});

// Rango válido del puntaje total de las escalas que tienen uno fijo.
const RANGO_PUNTAJE: Partial<Record<string, [number, number]>> = {
  EVA: [0, 10],
  BARTHEL: [0, 100],
  OSWESTRY: [0, 100], // porcentaje de discapacidad
};

export const crearEvaluacionSchema = z
  .object({
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
  })
  .superRefine((d, ctx) => {
    const rango = RANGO_PUNTAJE[d.tipoEscala];
    if (rango && d.puntajeTotal !== undefined && (d.puntajeTotal < rango[0] || d.puntajeTotal > rango[1])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["puntajeTotal"],
        message: `El puntaje de ${d.tipoEscala} debe estar entre ${rango[0]} y ${rango[1]}`,
      });
    }
  });

export type ActualizarHistoriaInput = z.infer<typeof actualizarHistoriaSchema>;
export type CrearEvaluacionInput = z.infer<typeof crearEvaluacionSchema>;
