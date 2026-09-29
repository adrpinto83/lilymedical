import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { ServiciosPage } from "./ServiciosPage";
import * as facturacion from "../../services/facturacion";

vi.mock("../../services/facturacion");

const activo = { id: "t1", nombreServicio: "Terapia Física", precio: "30.00", activo: true };
const inactivo = { id: "t2", nombreServicio: "Onda corta", precio: "15.00", activo: false };

beforeEach(() => {
  vi.mocked(facturacion.listarTarifas).mockResolvedValue([activo, inactivo]);
  vi.mocked(facturacion.crearTarifa).mockResolvedValue(activo);
  vi.mocked(facturacion.actualizarTarifa).mockResolvedValue(activo);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("ServiciosPage", () => {
  it("pide también los desactivados y los oculta hasta marcarlos", async () => {
    render(<ServiciosPage />);
    expect(await screen.findByText("Terapia Física")).toBeTruthy();
    expect(facturacion.listarTarifas).toHaveBeenCalledWith(true);
    expect(screen.queryByText("Onda corta")).toBeNull();
    fireEvent.click(screen.getByLabelText(/Ver desactivados/));
    fireEvent.click(screen.getByText("Reactivar"));
    await waitFor(() => expect(facturacion.actualizarTarifa).toHaveBeenCalledWith("t2", { activo: true }));
  });

  it("agrega y edita servicios", async () => {
    render(<ServiciosPage />);
    await screen.findByText("Terapia Física");
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Magnetoterapia" } });
    fireEvent.change(screen.getByLabelText("Precio ($)"), { target: { value: "25" } });
    fireEvent.click(screen.getByText("Agregar"));
    await waitFor(() =>
      expect(facturacion.crearTarifa).toHaveBeenCalledWith({ nombreServicio: "Magnetoterapia", precio: 25, descripcion: undefined })
    );

    fireEvent.click(screen.getByText("Editar"));
    fireEvent.change(screen.getAllByLabelText("Precio ($)")[1], { target: { value: "35" } });
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() =>
      expect(facturacion.actualizarTarifa).toHaveBeenCalledWith("t1", {
        nombreServicio: "Terapia Física",
        precio: 35,
        descripcion: null,
      })
    );
  });
});
