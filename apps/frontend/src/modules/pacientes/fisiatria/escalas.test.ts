import { describe, expect, it } from "vitest";
import {
  BARTHEL,
  interpretarBarthel,
  interpretarEva,
  interpretarOswestry,
  porcentajeDelNormal,
  puntajeBarthel,
  puntajeOswestry,
} from "./escalas";

describe("Barthel", () => {
  it("suma 100 con todos los ítems en su máximo", () => {
    const maximos = Object.fromEntries(BARTHEL.map((i) => [i.clave, Math.max(...i.opciones.map((o) => o.puntos))]));
    expect(puntajeBarthel(maximos)).toBe(100);
    expect(interpretarBarthel(100)).toBe("Independiente");
  });

  it("interpreta el grado de dependencia", () => {
    expect(interpretarBarthel(15)).toBe("Dependencia total");
    expect(interpretarBarthel(45)).toBe("Dependencia severa");
    expect(interpretarBarthel(75)).toBe("Dependencia moderada");
    expect(interpretarBarthel(95)).toBe("Dependencia escasa");
  });
});

describe("Oswestry", () => {
  it("calcula el porcentaje sobre las secciones respondidas", () => {
    // 9 secciones con 2 puntos (la sexual sin responder): 18 / 45 = 40%
    const items = { dolor: 2, cuidados: 2, levantarPeso: 2, andar: 2, sentado: 2, dePie: 2, dormir: 2, social: 2, viajar: 2, sexual: null };
    expect(puntajeOswestry(items)).toBe(40);
    expect(interpretarOswestry(40)).toBe("Limitación funcional moderada");
  });

  it("devuelve null sin respuestas", () => {
    expect(puntajeOswestry({})).toBeNull();
  });
});

describe("EVA y goniometría", () => {
  it("clasifica la intensidad del dolor", () => {
    expect(interpretarEva(0)).toBe("Sin dolor");
    expect(interpretarEva(3)).toBe("Dolor leve");
    expect(interpretarEva(6)).toBe("Dolor moderado");
    expect(interpretarEva(8)).toBe("Dolor severo");
  });

  it("compara con el rango normal", () => {
    expect(porcentajeDelNormal({ grados: 90, normal: 180 })).toBe(50);
    expect(porcentajeDelNormal({ grados: 0, normal: 0 })).toBeNull();
  });
});
