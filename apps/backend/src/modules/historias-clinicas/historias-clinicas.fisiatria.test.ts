import { describe, expect, it } from "vitest";
import { detalleEvaluacion } from "./historias-clinicas.pdf";
import { crearEvaluacionSchema } from "./historias-clinicas.schema";

describe("detalleEvaluacion", () => {
  it("lista interpretación y mediciones goniométricas y de fuerza", () => {
    expect(
      detalleEvaluacion({
        interpretacion: "Dependencia moderada",
        mediciones: [
          { articulacion: "Hombro", movimiento: "Flexión", lado: "D", grados: 120, normal: 180 },
          { grupo: "Cuádriceps", lado: "I", grado: 4 },
        ],
      })
    ).toEqual(["Dependencia moderada", "• Hombro – Flexión der.: 120° (normal 180°)", "• Cuádriceps izq.: 4/5"]);
  });

  it("tolera datos vacíos o antiguos", () => {
    expect(detalleEvaluacion({})).toEqual([]);
    expect(detalleEvaluacion(null)).toEqual([]);
  });
});

describe("crearEvaluacionSchema", () => {
  it("rechaza puntajes fuera de rango", () => {
    expect(crearEvaluacionSchema.safeParse({ tipoEscala: "EVA", datos: {}, puntajeTotal: 12 }).success).toBe(false);
    expect(crearEvaluacionSchema.safeParse({ tipoEscala: "BARTHEL", datos: {}, puntajeTotal: 85 }).success).toBe(true);
  });
});
