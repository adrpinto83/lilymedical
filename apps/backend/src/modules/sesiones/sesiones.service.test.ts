import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma", () => {
  const cliente: any = {
    historiaClinica: { findUnique: vi.fn() },
    cita: { findUnique: vi.fn(), update: vi.fn() },
    sesion: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  };
  cliente.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(cliente));
  return { prisma: cliente };
});

import { prisma } from "../../lib/prisma";
import { crearSesion, actualizarSesion, eliminarSesion } from "./sesiones.service";

const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  db.historiaClinica.findUnique.mockResolvedValue({ id: "h1" });
  db.cita.findUnique.mockResolvedValue({ id: "c1", pacienteId: "p1" });
  db.sesion.create.mockResolvedValue({ id: "s1" });
});

const nota = { pacienteId: "p1", citaId: "c1", notaEvolucion: "Evoluciona bien" };

describe("crearSesion", () => {
  it.each([
    ["ASISTIO", "ATENDIDA"],
    ["INASISTIO", "NO_ASISTIO"],
    ["CANCELO", "CANCELADA"],
  ] as const)("con asistencia %s deja la cita en %s", async (asistencia, estado) => {
    await crearSesion("u1", { ...nota, asistencia });
    expect(db.cita.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado } });
  });

  it("rechaza vincular una cita de otro paciente", async () => {
    db.cita.findUnique.mockResolvedValue({ id: "c1", pacienteId: "otro" });
    await expect(crearSesion("u1", { ...nota, asistencia: "ASISTIO" })).rejects.toThrow(/otro paciente/);
    expect(db.sesion.create).not.toHaveBeenCalled();
  });

  it("sin cita no toca la agenda", async () => {
    await crearSesion("u1", { pacienteId: "p1", notaEvolucion: "x", asistencia: "ASISTIO" });
    expect(db.cita.update).not.toHaveBeenCalled();
  });
});

describe("actualizarSesion", () => {
  it("si cambia la asistencia, actualiza también la cita", async () => {
    db.sesion.findUnique.mockResolvedValue({ id: "s1", citaId: "c1", asistencia: "ASISTIO" });
    await actualizarSesion("s1", { asistencia: "INASISTIO" });
    expect(db.cita.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "NO_ASISTIO" } });
  });

  it("editar solo la nota no toca la cita", async () => {
    db.sesion.findUnique.mockResolvedValue({ id: "s1", citaId: "c1", asistencia: "ASISTIO" });
    await actualizarSesion("s1", { notaEvolucion: "Corrección" });
    expect(db.cita.update).not.toHaveBeenCalled();
  });
});

describe("eliminarSesion", () => {
  it("devuelve la cita a PROGRAMADA", async () => {
    db.sesion.findUnique.mockResolvedValue({ id: "s1", citaId: "c1" });
    await eliminarSesion("s1");
    expect(db.sesion.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(db.cita.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { estado: "PROGRAMADA" } });
  });
});
