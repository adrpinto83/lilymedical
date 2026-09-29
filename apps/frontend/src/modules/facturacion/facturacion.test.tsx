import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { FacturaFormModal } from "./FacturaFormModal";
import { FacturaDetalleModal } from "./FacturaDetalleModal";
import { calcularSplit } from "./facturacionUtils";
import * as facturacion from "../../services/facturacion";
import * as pacientes from "../../services/pacientes";
import * as autorizaciones from "../../services/autorizaciones";
import type { Factura } from "../../types";

vi.mock("../../services/facturacion");
vi.mock("../../services/pacientes");
vi.mock("../../services/autorizaciones");

const tarifa = { id: "t1", nombreServicio: "Terapia física", precio: "30.00", activo: true };
const hcm = {
  id: "a1",
  nombre: "HCM Seguros",
  requiereAutorizacion: false,
  porcentajeCobertura: 80,
  topeMontoPorSesion: null,
  activo: true,
};

beforeEach(() => {
  vi.mocked(facturacion.listarTarifas).mockResolvedValue([tarifa]);
  vi.mocked(pacientes.listarAseguradorasPaciente).mockResolvedValue([
    { id: "r1", pacienteId: "p1", aseguradoraId: "a1", esPrimaria: true, aseguradora: hcm },
  ]);
  vi.mocked(autorizaciones.listarAutorizacionesPaciente).mockResolvedValue([]);
  vi.mocked(facturacion.listarCitasPorFacturar).mockResolvedValue([
    { id: "c1", fechaHoraInicio: "2026-09-21T14:00:00", numeroSesionEnGrupo: 1, totalSesionesGrupo: 10, tarifa },
    { id: "c2", fechaHoraInicio: "2026-09-23T14:00:00", numeroSesionEnGrupo: 2, totalSesionesGrupo: 10, tarifa },
  ]);
  vi.mocked(facturacion.crearFactura).mockResolvedValue({ id: "f1" } as Factura);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("calcularSplit", () => {
  it("aplica cobertura y tope por sesión como el backend", () => {
    expect(calcularSplit(300, { porcentajeCobertura: 80, topeMontoPorSesion: "20" }, 10)).toEqual({ aseguradora: 200, paciente: 100 });
    expect(calcularSplit(100, null, 1)).toEqual({ aseguradora: null, paciente: 100 });
  });
});

describe("FacturaFormModal", () => {
  it("factura las sesiones pendientes al seguro primario mostrando el reparto", async () => {
    render(<FacturaFormModal open pacienteIdFijo="p1" onClose={() => {}} onCreated={() => {}} />);
    fireEvent.click(await screen.findByText("Agregar todas"));
    // 2 sesiones × $30 = $60; HCM cubre 80%
    expect(await screen.findByText("Cubre HCM Seguros")).toBeTruthy();
    expect(screen.getByText("$48,00")).toBeTruthy();
    expect(screen.getByText("$12,00")).toBeTruthy();

    fireEvent.click(screen.getByText(/Emitir factura por/));
    await waitFor(() =>
      expect(facturacion.crearFactura).toHaveBeenCalledWith(
        expect.objectContaining({
          pacienteId: "p1",
          aseguradoraId: "a1",
          detalles: [
            expect.objectContaining({ tarifaId: "t1", cantidad: 1, citaId: "c1" }),
            expect.objectContaining({ tarifaId: "t1", cantidad: 1, citaId: "c2" }),
          ],
        })
      )
    );
  });
});

describe("FacturaDetalleModal", () => {
  it("cobra en bolívares con la tasa del día", async () => {
    vi.mocked(facturacion.obtenerFactura).mockResolvedValue({
      id: "f1",
      numeroFactura: "LM-2026-00010",
      pacienteId: "p1",
      paciente: { nombres: "Ana", apellidos: "Rojas", documento: "V-123" },
      fecha: "2026-09-29T10:00:00",
      subtotal: "60.00",
      impuestos: "0.00",
      total: "60.00",
      estado: "PENDIENTE",
      montoPaciente: "60.00",
      pagado: "0",
      saldo: "60",
      detalles: [],
      pagos: [],
    } as Factura);
    vi.mocked(facturacion.registrarPago).mockResolvedValue({} as never);

    render(<FacturaDetalleModal facturaId="f1" onClose={() => {}} onCambio={() => {}} />);
    fireEvent.change(await screen.findByLabelText("Método"), { target: { value: "PAGO_MOVIL" } });
    fireEvent.change(screen.getByLabelText("Tasa del día (Bs por $)"), { target: { value: "40" } });
    fireEvent.click(screen.getByText(/Saldo completo/));
    expect((screen.getByLabelText("Monto recibido (Bs)") as HTMLInputElement).value).toBe("2400.00");
    expect(screen.getByText("Equivale a $60,00")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() =>
      expect(facturacion.registrarPago).toHaveBeenCalledWith("f1", {
        metodoPago: "PAGO_MOVIL",
        referencia: undefined,
        montoBs: 2400,
        tasaCambio: 40,
      })
    );
  });
});
