import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { AvisoPortadaPage } from "./AvisoPortadaPage";
import * as servicio from "../../services/avisosPortada";
import type { AvisoPortadaGestion } from "../../services/avisosPortada";

vi.mock("../../services/avisosPortada");

function aviso(id: string, titulo: string, tipo: "DEDICATORIA" | "COMERCIAL", activo: boolean): AvisoPortadaGestion {
  return {
    id,
    tipo,
    titulo,
    activo,
    etiqueta: null,
    mensaje: "Mensaje",
    firma: null,
    textoBoton: "Entrar al sitio",
    enlaceUrl: null,
    enlaceTexto: null,
    createdAt: "2026-09-24T10:00:00.000Z",
    updatedAt: "2026-09-24T10:00:00.000Z",
  };
}

const dedicatoria = aviso("d", "¡Feliz cumpleaños, Dra. Lilia!", "DEDICATORIA", true);
const promo = aviso("c", "Promoción de octubre", "COMERCIAL", false);

beforeEach(() => {
  vi.mocked(servicio.listarAvisos).mockResolvedValue([dedicatoria, promo]);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function fila(titulo: string) {
  return screen.getAllByText(titulo).find((el) => el.closest("li"))!.closest("li")!;
}

describe("AvisoPortadaPage", () => {
  it("muestra cuál está activo y protege la dedicatoria histórica", async () => {
    render(<AvisoPortadaPage />);
    expect(await screen.findByText(/la portada muestra/i)).toHaveTextContent("Feliz cumpleaños");

    const filaDedicatoria = fila("¡Feliz cumpleaños, Dra. Lilia!");
    expect(within(filaDedicatoria).getByText(/histórico/)).toBeInTheDocument();
    expect(within(filaDedicatoria).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(within(filaDedicatoria).queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();

    expect(within(fila("Promoción de octubre")).getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("activa un aviso comercial en lugar de la dedicatoria", async () => {
    vi.mocked(servicio.cambiarAvisoActivo).mockResolvedValue([
      { ...dedicatoria, activo: false },
      { ...promo, activo: true },
    ]);
    render(<AvisoPortadaPage />);
    await screen.findByText(/la portada muestra/i);

    fireEvent.click(within(fila("Promoción de octubre")).getByRole("button", { name: "Activar" }));

    await waitFor(() => expect(servicio.cambiarAvisoActivo).toHaveBeenCalledWith("c", true));
    expect(await screen.findByText(/la portada muestra/i)).toHaveTextContent("Promoción de octubre");
  });

  it("permite dejar la portada sin aviso", async () => {
    vi.mocked(servicio.cambiarAvisoActivo).mockResolvedValue([{ ...dedicatoria, activo: false }, promo]);
    render(<AvisoPortadaPage />);
    await screen.findByText(/la portada muestra/i);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar aviso" }));

    expect(await screen.findByText(/no muestra ningún aviso/i)).toBeInTheDocument();
    expect(servicio.cambiarAvisoActivo).toHaveBeenCalledWith("d", false);
  });
});
