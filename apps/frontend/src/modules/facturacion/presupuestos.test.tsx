import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { PresupuestoFormModal } from "./PresupuestoFormModal";
import * as facturacion from "../../services/facturacion";
import * as pacientes from "../../services/pacientes";
import * as historias from "../../services/historiasClinicas";
import * as presupuestos from "../../services/presupuestos";
import type { HistoriaClinica, Paciente, Presupuesto } from "../../types";

vi.mock("../../services/facturacion");
vi.mock("../../services/pacientes");
vi.mock("../../services/historiasClinicas");
vi.mock("../../services/presupuestos");
const rol = vi.hoisted(() => ({ actual: "MEDICO" }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { rol: rol.actual } }) }));

const paciente = { id: "p1", nombres: "Luis", apellidos: "González", documento: "17802485" } as Paciente;

beforeEach(() => {
  localStorage.clear();
  rol.actual = "MEDICO";
  vi.mocked(facturacion.listarTarifas).mockResolvedValue([
    { id: "t1", nombreServicio: "Terapia de rehabilitación", precio: "20.00", activo: true },
  ]);
  vi.mocked(pacientes.listarPacientes).mockResolvedValue([paciente]);
  vi.mocked(historias.obtenerHistoriaPorPaciente).mockResolvedValue({
    diagnosticoPrincipal: "Mallet finger dedo meñique derecho",
  } as HistoriaClinica);
  vi.mocked(presupuestos.crearPresupuesto).mockResolvedValue({ id: "pr1" } as Presupuesto);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

async function llenar() {
  render(<PresupuestoFormModal open onClose={() => {}} onCreated={() => {}} />);
  fireEvent.change(screen.getByLabelText("Paciente"), { target: { value: "17802485" } });
  await waitFor(() => expect((screen.getByLabelText("Paciente elegido") as HTMLSelectElement).value).toBe("p1"));
  await screen.findByRole("option", { name: /Terapia de rehabilitación/ });
  fireEvent.change(screen.getByLabelText("Servicio 1"), { target: { value: "t1" } });
  fireEvent.change(screen.getByLabelText("Cantidad 1"), { target: { value: "15" } });
}

describe("PresupuestoFormModal", () => {
  it("calcula el total en $ y en Bs BCV y lo envía con el IDX de la historia", async () => {
    await llenar();
    await waitFor(() =>
      expect((screen.getByLabelText("IDX (diagnóstico)") as HTMLInputElement).value).toBe("Mallet finger dedo meñique derecho")
    );
    fireEvent.change(screen.getByLabelText("Tasa BCV (Bs por $)"), { target: { value: "832.4883" } });
    expect(screen.getByText("$300,00")).toBeTruthy();
    expect(screen.getByText("Bs 249.746,49")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Crear presupuesto" }));
    await waitFor(() =>
      expect(presupuestos.crearPresupuesto).toHaveBeenCalledWith({
        pacienteId: "p1",
        diagnostico: "Mallet finger dedo meñique derecho",
        tasaCambio: 832.4883,
        notas: undefined,
        items: [{ tarifaId: "t1", descripcion: "Terapia de rehabilitación", cantidad: 15, precioUnitario: 20 }],
      })
    );
  });

  it("el personal administrativo no consulta la historia: escribe el IDX", async () => {
    rol.actual = "ADMINISTRATIVO";
    await llenar();
    expect(historias.obtenerHistoriaPorPaciente).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Crear presupuesto" }));
    await waitFor(() =>
      expect(presupuestos.crearPresupuesto).toHaveBeenCalledWith(
        expect.objectContaining({ diagnostico: undefined, tasaCambio: undefined })
      )
    );
  });

  it("desde el estado de cuenta el paciente ya viene elegido", async () => {
    render(<PresupuestoFormModal open pacienteIdFijo="p1" onClose={() => {}} onCreated={() => {}} />);
    expect(screen.queryByLabelText("Paciente")).toBeNull();
    expect(pacientes.listarPacientes).not.toHaveBeenCalled();
    await screen.findByRole("option", { name: /Terapia de rehabilitación/ });
    fireEvent.change(screen.getByLabelText("Servicio 1"), { target: { value: "t1" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear presupuesto" }));
    await waitFor(() =>
      expect(presupuestos.crearPresupuesto).toHaveBeenCalledWith(expect.objectContaining({ pacienteId: "p1" }))
    );
  });
});
