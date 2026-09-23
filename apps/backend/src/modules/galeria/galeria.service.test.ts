import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import { pieDesdeNombre, posicionesDeOrden } from "./galeria.service";

describe("pieDesdeNombre", () => {
  it("quita el número de orden, la extensión y los separadores", () => {
    expect(pieDesdeNombre("01-terapia-de-hombro.jpg")).toBe("Terapia de hombro");
    expect(pieDesdeNombre("02_sesion_en_camilla.webp")).toBe("Sesion en camilla");
    expect(pieDesdeNombre("consultorio.png")).toBe("Consultorio");
  });

  it("cae en un texto genérico cuando el nombre no aporta nada", () => {
    expect(pieDesdeNombre("03.jpg")).toBe("Fotografía del consultorio");
    expect(pieDesdeNombre("IMG_1234.jpg")).toBe("IMG 1234");
  });
});

describe("posicionesDeOrden", () => {
  it("numera desde cero siguiendo la lista recibida", () => {
    expect(posicionesDeOrden(["c", "a", "b"])).toEqual([
      { id: "c", orden: 0 },
      { id: "a", orden: 1 },
      { id: "b", orden: 2 },
    ]);
  });

  it("devuelve una lista vacía sin ids", () => {
    expect(posicionesDeOrden([])).toEqual([]);
  });
});
