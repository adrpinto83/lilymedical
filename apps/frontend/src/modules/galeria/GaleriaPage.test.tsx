import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { GaleriaPage } from "./GaleriaPage";
import * as servicio from "../../services/galeria";
import type { FotoGaleriaGestion } from "../../services/galeria";

vi.mock("../../services/galeria");

function foto(id: string, pie: string, orden: number, visible = true): FotoGaleriaGestion {
  return {
    id,
    pie,
    orden,
    visible,
    url: `/uploads/galeria/${id}.jpg`,
    archivo: `${id}.jpg`,
    nombreOriginal: `${pie}.jpg`,
    createdAt: "2026-09-23T10:00:00.000Z",
  };
}

const iniciales = [foto("a", "Sala de terapia", 0), foto("b", "Camilla", 1, false)];

beforeEach(() => {
  vi.mocked(servicio.listarGaleriaGestion).mockResolvedValue(iniciales);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("GaleriaPage", () => {
  it("lista las fotos cargadas con su estado de visibilidad", async () => {
    render(<GaleriaPage />);

    expect(await screen.findByDisplayValue("Sala de terapia")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Camilla")).toBeInTheDocument();
    expect(screen.getByText("Visible")).toBeInTheDocument();
    expect(screen.getByText("Oculta")).toBeInTheDocument();
    expect(screen.getByText(/1 visible de 2/)).toBeInTheDocument();
  });

  it("avisa si se pulsa subir sin elegir un archivo", async () => {
    render(<GaleriaPage />);
    await screen.findByDisplayValue("Sala de terapia");

    fireEvent.click(screen.getByRole("button", { name: "Subir" }));

    expect(await screen.findByText(/elige una imagen/i)).toBeInTheDocument();
    expect(servicio.subirFotoGaleria).not.toHaveBeenCalled();
  });

  it("sube el archivo elegido junto al pie escrito", async () => {
    vi.mocked(servicio.subirFotoGaleria).mockResolvedValue(foto("c", "Nueva", 2));
    render(<GaleriaPage />);
    await screen.findByDisplayValue("Sala de terapia");

    const archivo = new File(["x"], "consultorio.jpg", { type: "image/jpeg" });
    fireEvent.change(document.querySelector("#archivo") as HTMLInputElement, {
      target: { files: [archivo] },
    });
    fireEvent.change(screen.getByLabelText("Pie de foto", { selector: "#pie" }), {
      target: { value: "Recepción del consultorio" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subir" }));

    await waitFor(() =>
      expect(servicio.subirFotoGaleria).toHaveBeenCalledWith(archivo, "Recepción del consultorio")
    );
  });

  it("cambia la visibilidad de una foto", async () => {
    vi.mocked(servicio.actualizarFotoGaleria).mockResolvedValue({ ...iniciales[0], visible: false });
    render(<GaleriaPage />);
    const fila = (await screen.findByDisplayValue("Sala de terapia")).closest("li")!;

    fireEvent.click(within(fila).getByRole("button", { name: "Ocultar" }));

    await waitFor(() =>
      expect(servicio.actualizarFotoGaleria).toHaveBeenCalledWith("a", { visible: false })
    );
  });

  it("reordena enviando la lista completa de ids", async () => {
    vi.mocked(servicio.reordenarGaleria).mockResolvedValue([
      { ...iniciales[1], orden: 0 },
      { ...iniciales[0], orden: 1 },
    ]);
    render(<GaleriaPage />);
    await screen.findByDisplayValue("Sala de terapia");

    fireEvent.click(screen.getByRole("button", { name: /mover camilla hacia arriba/i }));

    await waitFor(() => expect(servicio.reordenarGaleria).toHaveBeenCalledWith(["b", "a"]));
  });

  it("elimina una foto tras confirmar", async () => {
    vi.stubGlobal("confirm", () => true);
    vi.mocked(servicio.eliminarFotoGaleria).mockResolvedValue(undefined);
    render(<GaleriaPage />);
    const fila = (await screen.findByDisplayValue("Camilla")).closest("li")!;

    fireEvent.click(within(fila).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(servicio.eliminarFotoGaleria).toHaveBeenCalledWith("b"));
    expect(screen.queryByDisplayValue("Camilla")).toBeNull();
    vi.unstubAllGlobals();
  });
});
