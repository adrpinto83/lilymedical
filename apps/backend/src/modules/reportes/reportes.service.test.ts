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

import { claveDia, repartirSaldo, serieIngresos } from "./reportes.resumen";
import { fechaCsv, numeroCsv, toCsv } from "../../lib/csv";

describe("serieIngresos", () => {
  it("agrupa por día e incluye los días sin cobros", () => {
    const D = (v: string) => new Prisma.Decimal(v);
    const s = serieIngresos(
      [
        { fecha: new Date(2026, 8, 1, 10), monto: D("30") },
        { fecha: new Date(2026, 8, 1, 16), monto: D("20") },
        { fecha: new Date(2026, 8, 3, 9), monto: D("15") },
      ],
      new Date(2026, 8, 1),
      new Date(2026, 8, 3, 23, 59)
    );
    expect(s.granularidad).toBe("dia");
    expect(s.puntos).toEqual([
      { fecha: "2026-09-01", total: "50.00" },
      { fecha: "2026-09-02", total: "0.00" },
      { fecha: "2026-09-03", total: "15.00" },
    ]);
  });

  it("pasa a meses en períodos largos", () => {
    const s = serieIngresos([], new Date(2026, 0, 1), new Date(2026, 5, 30));
    expect(s.granularidad).toBe("mes");
    expect(s.puntos.map((p) => p.fecha)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
    expect(claveDia(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("repartirSaldo", () => {
  const D = (v: number) => new Prisma.Decimal(v);
  it("asume que primero paga el paciente", () => {
    // Total 100, seguro cubre 80, paciente ya pagó sus 20: resta todo del seguro
    const r = repartirSaldo({ total: D(100), montoAseguradora: D(80), pagado: D(20) });
    expect([r.saldo, r.aseguradora, r.paciente].map(String)).toEqual(["80", "80", "0"]);
    // Nada pagado: 80 del seguro y 20 del paciente
    const r2 = repartirSaldo({ total: D(100), montoAseguradora: D(80), pagado: D(0) });
    expect([r2.aseguradora, r2.paciente].map(String)).toEqual(["80", "20"]);
  });

  it("una factura particular es toda del paciente", () => {
    const r = repartirSaldo({ total: D(50), montoAseguradora: null, pagado: D(10) });
    expect([r.aseguradora, r.paciente].map(String)).toEqual(["0", "40"]);
  });
});

describe("CSV para Excel en español", () => {
  it("usa BOM, punto y coma y coma decimal", () => {
    const csv = toCsv([{ Paciente: "Pérez; Ana", "Monto $": numeroCsv(1234.5) }]);
    expect(csv).toBe('﻿Paciente;Monto $\r\n"Pérez; Ana";1234,50');
    expect(fechaCsv(new Date(2026, 8, 5))).toBe("05/09/2026");
    expect(numeroCsv(null)).toBe("");
  });
});
