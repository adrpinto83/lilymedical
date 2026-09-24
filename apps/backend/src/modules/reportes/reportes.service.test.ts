import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import { agruparIngresosPorMes } from "./reportes.service";

describe("agruparIngresosPorMes", () => {
  it("suma por mes e incluye en 0 los meses sin pagos", () => {
    const pagos = [
      { fecha: new Date(2026, 6, 3), monto: new Prisma.Decimal("40.50") },
      { fecha: new Date(2026, 6, 20), monto: new Prisma.Decimal("9.50") },
      { fecha: new Date(2026, 8, 1), monto: new Prisma.Decimal("100") },
    ];

    expect(agruparIngresosPorMes(pagos, new Date(2026, 6, 1), 3)).toEqual([
      { mes: "2026-07", total: "50.00" },
      { mes: "2026-08", total: "0.00" },
      { mes: "2026-09", total: "100.00" },
    ]);
  });

  it("cruza el cambio de año", () => {
    const serie = agruparIngresosPorMes([], new Date(2025, 10, 1), 3);
    expect(serie.map((s) => s.mes)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});
