import { describe, it, expect } from "vitest";
import { cumpleHoy, hoyEnConsultorio } from "./correos.service";
import { felicitacionCumpleanos } from "./correos.plantillas";

// Fechas de nacimiento como las guarda la app: medianoche UTC.
const nacio = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("cumpleaños", () => {
  it("usa el día del consultorio: a las 10 p. m. en Caracas ya es mañana en UTC", () => {
    // 1 oct 02:00 UTC = 30 sep 22:00 en Caracas
    expect(hoyEnConsultorio(new Date("2026-10-01T02:00:00Z"))).toEqual({ anio: 2026, mes: 9, dia: 30 });
  });

  it("reconoce el cumpleaños sin correrse un día por la zona horaria", () => {
    const hoy = { anio: 2026, mes: 9, dia: 30 };
    expect(cumpleHoy(nacio("1990-09-30"), hoy)).toBe(true);
    expect(cumpleHoy(nacio("1990-10-01"), hoy)).toBe(false);
    expect(cumpleHoy(nacio("1990-09-29"), hoy)).toBe(false);
  });

  it("quien nació un 29 de febrero celebra el 28 en años no bisiestos", () => {
    expect(cumpleHoy(nacio("2000-02-29"), { anio: 2026, mes: 2, dia: 28 })).toBe(true);
    expect(cumpleHoy(nacio("2000-02-29"), { anio: 2028, mes: 2, dia: 28 })).toBe(false);
    expect(cumpleHoy(nacio("2000-02-29"), { anio: 2028, mes: 2, dia: 29 })).toBe(true);
  });

  it("la plantilla saluda por nombre y no menciona la edad", () => {
    const { subject, html } = felicitacionCumpleanos(
      { nombres: "María" },
      { nombreMedico: "Dra. Lilia Figuera" }
    );
    expect(subject).toBe("¡Feliz cumpleaños, María! 🎉");
    expect(html).toContain("Dra. Lilia Figuera");
    expect(html).not.toMatch(/\d+ años/);
  });
});
