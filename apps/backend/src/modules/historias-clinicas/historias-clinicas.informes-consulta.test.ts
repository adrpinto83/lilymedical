import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    historiaClinica: { findUnique: vi.fn() },
    fechaInformeConsulta: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { prisma } from "../../lib/prisma";
import { listarInformesConsulta, cambiarFechaInformeConsulta } from "./historias-clinicas.service";

const db = prisma as any;

beforeEach(() => vi.clearAllMocks());

describe("listarInformesConsulta", () => {
  it("agrupa por día del consultorio y usa la fecha puesta al informe", async () => {
    db.historiaClinica.findUnique.mockResolvedValue({
      id: "h1",
      // 6/10 a las 22:00 en Caracas es 7/10 en UTC: sigue siendo la consulta del 6.
      sesiones: [
        { id: "s1", fecha: new Date("2026-10-07T02:00:00Z") },
        { id: "s2", fecha: new Date("2026-10-01T14:00:00Z") },
      ],
      evaluaciones: [{ id: "e1", fecha: new Date("2026-10-06T13:00:00Z") }],
      fechasInformeConsulta: [{ dia: "2026-10-01", fecha: new Date("2026-10-05T12:00:00Z") }],
    });

    const informes = await listarInformesConsulta("p1");

    expect(informes.map((i) => i.dia)).toEqual(["2026-10-06", "2026-10-01"]);
    expect(informes[0]).toMatchObject({ sesiones: 1, evaluaciones: 1, referencia: { evaluacionId: "e1" }, fechaInforme: null });
    expect(informes[1]).toMatchObject({ referencia: { sesionId: "s2" }, fechaInforme: new Date("2026-10-05T12:00:00Z") });
  });
});

describe("cambiarFechaInformeConsulta", () => {
  it("guarda la fecha a mediodía UTC y null la quita", async () => {
    db.historiaClinica.findUnique.mockResolvedValue({ id: "h1" });
    db.fechaInformeConsulta.upsert.mockImplementation(({ create }: any) => create);

    await cambiarFechaInformeConsulta("p1", "2026-10-01", "2026-10-05");
    expect(db.fechaInformeConsulta.upsert.mock.calls[0][0].create.fecha).toEqual(new Date("2026-10-05T12:00:00Z"));

    await cambiarFechaInformeConsulta("p1", "2026-10-01", null);
    expect(db.fechaInformeConsulta.deleteMany).toHaveBeenCalledWith({ where: { historiaClinicaId: "h1", dia: "2026-10-01" } });
  });
});
