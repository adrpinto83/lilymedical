import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ReportesPage } from "./ReportesPage";
import * as reportes from "../../services/reportes";
import type { ResumenReporte } from "../../services/reportes";

vi.mock("../../services/reportes");

const base: ResumenReporte = {
  periodo: { desde: "", hasta: "", anteriorDesde: "", anteriorHasta: "" },
  actual: { cobrado: "300.00", facturado: "400.00", citasAtendidas: 12, pacientesNuevos: 3 },
  anterior: { cobrado: "200.00", facturado: "0.00", citasAtendidas: 12, pacientesNuevos: 4 },
  finanzas: {
    facturas: 8,
    facturado: "400.00",
    facturadoAseguradoras: "150.00",
    facturadoParticular: "250.00",
    ticketPromedio: "50.00",
    cobrado: "300.00",
    recibidoEnBs: "3650.00",
    serie: { granularidad: "dia", puntos: [{ fecha: "2026-09-01", total: "100.00" }, { fecha: "2026-09-02", total: "200.00" }] },
    porMetodo: [
      { metodo: "PAGO_MOVIL", total: "200.00", totalBs: "3650.00", cantidad: 4 },
      { metodo: "EFECTIVO", total: "100.00", totalBs: "0.00", cantidad: 2 },
    ],
  },
  porCobrar: {
    total: "180.00",
    pacientes: "30.00",
    aseguradoras: "150.00",
    antiguedad: [{ etiqueta: "0-30 días", saldo: "180.00", facturas: 3 }],
    porAseguradora: [{ nombre: "PDVSA - HCM", saldo: "150.00", facturas: 2 }],
  },
  agenda: {
    total: 15,
    estados: { ATENDIDA: 12, NO_ASISTIO: 2, CANCELADA: 1, CONFIRMADA: 0, PROGRAMADA: 0 },
    tasaAsistencia: 86,
    pacientesAtendidos: 7,
    porProfesional: [{ nombre: "Lily Pinto", atendidas: 12, noAsistio: 2, canceladas: 1, total: 15 }],
  },
  servicios: [{ servicio: "Terapia Física", cantidad: 10, total: "300.00" }],
  clinico: null,
};

beforeEach(() => {
  vi.mocked(reportes.obtenerResumen).mockResolvedValue(base);
  vi.mocked(reportes.descargarCuentasPorCobrarCsv).mockResolvedValue();
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("ReportesPage", () => {
  it("carga el mes en curso y muestra finanzas, por cobrar y agenda", async () => {
    render(<ReportesPage />);
    expect(await screen.findByText("▲ 50%")).toBeTruthy(); // cobrado 300 vs 200
    expect(screen.getByText("Pago móvil")).toBeTruthy();
    expect(screen.getAllByText(/Bs 3\.650,00/).length).toBeGreaterThan(0);
    expect(screen.getByText("PDVSA - HCM")).toBeTruthy();
    expect(screen.getByText("86%")).toBeTruthy();
    // Sin datos clínicos (no es médico): no aparece la sección
    expect(screen.queryByText("Resultados de terapia")).toBeNull();
  });

  it("muestra resultados de terapia al médico y cambia de período", async () => {
    vi.mocked(reportes.obtenerResumen).mockResolvedValue({
      ...base,
      clinico: {
        sesiones: 20,
        sesionesConEva: 10,
        evaPrePromedio: 6.4,
        evaPostPromedio: 4.1,
        sesionesConAlivio: 9,
        modalidades: [{ nombre: "TENS", veces: 14 }],
      },
    });
    render(<ReportesPage />);
    expect(await screen.findByText("6.4 → 4.1")).toBeTruthy();
    expect(screen.getByText("90%")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "anio" } });
    await waitFor(() => expect(reportes.obtenerResumen).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByText("Exportar detalle (Excel)"));
    await waitFor(() => expect(reportes.descargarCuentasPorCobrarCsv).toHaveBeenCalled());
  });
});
