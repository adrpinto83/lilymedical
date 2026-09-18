import { describe, it, expect, vi, afterEach } from "vitest";
import { alertaMantenimiento, fechaCorta } from "./equiposUi";

afterEach(() => {
  vi.useRealTimers();
});

describe("fechaCorta", () => {
  it("lee la fecha de calendario sin correrla por zona horaria", () => {
    expect(fechaCorta("2026-09-18T00:00:00.000Z")).toBe("18/09/2026");
    expect(fechaCorta(null)).toBe("—");
  });
});

describe("alertaMantenimiento", () => {
  it("clasifica según los días que faltan", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 18, 10, 0));

    expect(alertaMantenimiento(null).color).toBe("slate");
    expect(alertaMantenimiento("2026-09-15T00:00:00.000Z")).toEqual({ texto: "Vencido hace 3 d", color: "red" });
    expect(alertaMantenimiento("2026-09-18T00:00:00.000Z")).toEqual({ texto: "Vence hoy", color: "amber" });
    expect(alertaMantenimiento("2026-09-25T00:00:00.000Z")).toEqual({ texto: "En 7 d", color: "amber" });
    expect(alertaMantenimiento("2026-12-01T00:00:00.000Z")).toEqual({ texto: "01/12/2026", color: "green" });
  });
});
