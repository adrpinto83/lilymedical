import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    equipo: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    mantenimientoEquipo: { create: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

import { prisma } from "../../lib/prisma";
import {
  calcularProximoMantenimiento,
  estadoAlertaMantenimiento,
  registrarMantenimiento,
  crearEquipo,
} from "./equipos.service";

const DIA = 24 * 60 * 60 * 1000;
const hoy = new Date("2026-09-18T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calcularProximoMantenimiento", () => {
  it("suma la frecuencia a la fecha base", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    expect(calcularProximoMantenimiento(90, base)?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("devuelve null si el equipo no tiene frecuencia definida", () => {
    expect(calcularProximoMantenimiento(null, new Date())).toBeNull();
  });

  it("usa hoy como base si no hay fecha previa", () => {
    expect(calcularProximoMantenimiento(10, null, hoy)?.getTime()).toBe(hoy.getTime() + 10 * DIA);
  });
});

describe("estadoAlertaMantenimiento", () => {
  it("clasifica vencido, próximo, al día y sin plan", () => {
    expect(estadoAlertaMantenimiento(new Date(hoy.getTime() - DIA), hoy, 15)).toBe("VENCIDO");
    expect(estadoAlertaMantenimiento(new Date(hoy.getTime() + 10 * DIA), hoy, 15)).toBe("PROXIMO");
    expect(estadoAlertaMantenimiento(new Date(hoy.getTime() + 30 * DIA), hoy, 15)).toBe("AL_DIA");
    expect(estadoAlertaMantenimiento(null, hoy, 15)).toBe("SIN_PLAN");
  });

  it("un mantenimiento que vence hoy todavía no figura como vencido", () => {
    const venceHoy = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    expect(estadoAlertaMantenimiento(venceHoy, hoy, 15)).toBe("PROXIMO");
  });
});

describe("crearEquipo", () => {
  it("calcula el próximo mantenimiento a partir del último registrado", async () => {
    await crearEquipo({
      nombre: "TENS",
      frecuenciaMantenimientoDias: 180,
      ultimoMantenimiento: new Date("2026-06-01T00:00:00Z"),
    });
    const data = vi.mocked(prisma.equipo.create).mock.calls[0][0].data as any;
    expect(data.proximoMantenimiento.toISOString()).toBe("2026-11-28T00:00:00.000Z");
  });
});

describe("registrarMantenimiento", () => {
  const equipo = {
    id: "e1",
    frecuenciaMantenimientoDias: 90,
    ultimoMantenimiento: new Date("2026-01-01T00:00:00Z"),
    mantenimientos: [],
  };

  it("un preventivo reinicia el calendario y deja el equipo operativo", async () => {
    vi.mocked(prisma.equipo.findUnique).mockResolvedValue(equipo as any);
    const fecha = new Date("2026-09-01T00:00:00Z");

    await registrarMantenimiento(
      "e1",
      { tipo: "PREVENTIVO", fecha, descripcion: "Revisión", estadoResultante: "OPERATIVO" },
      "u1"
    );

    const data = vi.mocked(prisma.equipo.update).mock.calls[0][0].data as any;
    expect(data.estado).toBe("OPERATIVO");
    expect(data.ultimoMantenimiento).toEqual(fecha);
    expect(data.proximoMantenimiento.toISOString()).toBe("2026-11-30T00:00:00.000Z");
  });

  it("un correctivo no mueve el calendario preventivo", async () => {
    vi.mocked(prisma.equipo.findUnique).mockResolvedValue(equipo as any);

    await registrarMantenimiento(
      "e1",
      {
        tipo: "CORRECTIVO",
        fecha: new Date("2026-09-01T00:00:00Z"),
        descripcion: "Cambio de cable de electrodos",
        estadoResultante: "OPERATIVO",
      },
      "u1"
    );

    const data = vi.mocked(prisma.equipo.update).mock.calls[0][0].data as any;
    expect(data).not.toHaveProperty("ultimoMantenimiento");
    expect(data).not.toHaveProperty("proximoMantenimiento");
  });

  it("un preventivo cargado con fecha anterior al último no retrocede el calendario", async () => {
    vi.mocked(prisma.equipo.findUnique).mockResolvedValue(equipo as any);

    await registrarMantenimiento(
      "e1",
      {
        tipo: "PREVENTIVO",
        fecha: new Date("2025-10-01T00:00:00Z"),
        descripcion: "Carga histórica",
        estadoResultante: "OPERATIVO",
      },
      "u1"
    );

    const data = vi.mocked(prisma.equipo.update).mock.calls[0][0].data as any;
    expect(data).not.toHaveProperty("proximoMantenimiento");
  });
});
