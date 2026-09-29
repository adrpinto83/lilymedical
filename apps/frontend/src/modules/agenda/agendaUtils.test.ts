import { describe, expect, it } from "vitest";
import { distribuirSolapes, enlaceWhatsApp } from "./agendaUtils";

const ev = (id: string, desde: string, hasta: string) => ({
  id,
  fechaHoraInicio: `2026-10-05T${desde}:00`,
  fechaHoraFin: `2026-10-05T${hasta}:00`,
});

describe("distribuirSolapes", () => {
  it("deja en una sola columna las citas que no se tocan", () => {
    const r = distribuirSolapes([ev("a", "09:00", "09:45"), ev("b", "09:45", "10:30")]);
    expect(r.get("a")).toEqual({ columna: 0, columnas: 1 });
    expect(r.get("b")).toEqual({ columna: 0, columnas: 1 });
  });

  it("pone lado a lado las citas que se solapan", () => {
    const r = distribuirSolapes([
      ev("a", "09:00", "10:00"),
      ev("b", "09:30", "10:30"),
      ev("c", "10:00", "11:00"),
      ev("d", "12:00", "13:00"),
    ]);
    expect(r.get("a")).toEqual({ columna: 0, columnas: 2 });
    expect(r.get("b")).toEqual({ columna: 1, columnas: 2 });
    // "c" reutiliza la columna que "a" dejó libre
    expect(r.get("c")).toEqual({ columna: 0, columnas: 2 });
    expect(r.get("d")).toEqual({ columna: 0, columnas: 1 });
  });
});

describe("enlaceWhatsApp", () => {
  it("normaliza teléfonos venezolanos", () => {
    expect(enlaceWhatsApp("0414-1234567")).toBe("https://wa.me/584141234567");
    expect(enlaceWhatsApp("+58 424 677 3472")).toBe("https://wa.me/584246773472");
    expect(enlaceWhatsApp("4121234567", "Hola")).toBe("https://wa.me/584121234567?text=Hola");
  });

  it("descarta números incompletos", () => {
    expect(enlaceWhatsApp("12345")).toBeNull();
    expect(enlaceWhatsApp(undefined)).toBeNull();
  });
});
