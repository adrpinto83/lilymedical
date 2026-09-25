import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { AvisoPortada } from "./AvisoPortada";
import * as servicio from "../../services/avisosPortada";
import type { AvisoPortada as Aviso } from "../../services/avisosPortada";

vi.mock("../../services/avisosPortada");

const dedicatoria: Aviso = {
  id: "d",
  tipo: "DEDICATORIA",
  etiqueta: "Dedicatoria",
  titulo: "¡Feliz cumpleaños, Dra. Lilia!",
  mensaje: "Primer párrafo.\n\nSegundo párrafo.",
  firma: "— AP ♡",
  textoBoton: "Entrar al sitio",
  enlaceUrl: null,
  enlaceTexto: null,
  updatedAt: "2026-09-24T14:22:30.000Z",
};

const promocion: Aviso = {
  ...dedicatoria,
  id: "c",
  tipo: "COMERCIAL",
  etiqueta: "Promoción",
  titulo: "Evaluación inicial con 20% de descuento",
  mensaje: "Solo en octubre.",
  firma: null,
  textoBoton: "Ver el sitio",
  enlaceUrl: "https://wa.me/584246773472",
  enlaceTexto: "Agendar por WhatsApp",
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.resetAllMocks();
});

describe("AvisoPortada", () => {
  it("muestra la dedicatoria activa con sus párrafos y firma", async () => {
    vi.mocked(servicio.obtenerAvisoActivo).mockResolvedValue(dedicatoria);
    render(<AvisoPortada />);
    expect(await screen.findByRole("dialog", { name: /feliz cumpleaños/i })).toBeInTheDocument();
    expect(screen.getByText("Segundo párrafo.")).toBeInTheDocument();
    expect(screen.getByText(/— AP/)).toBeInTheDocument();
  });

  it("muestra un aviso comercial con su botón de acción", async () => {
    vi.mocked(servicio.obtenerAvisoActivo).mockResolvedValue(promocion);
    render(<AvisoPortada />);
    await screen.findByRole("dialog", { name: /20% de descuento/i });
    expect(screen.getByRole("link", { name: /agendar por whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/584246773472"
    );
  });

  it("no muestra nada si no hay aviso activo", async () => {
    vi.mocked(servicio.obtenerAvisoActivo).mockResolvedValue(null);
    render(<AvisoPortada />);
    await Promise.resolve();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se cierra con el botón y no vuelve a aparecer en la misma sesión", async () => {
    vi.mocked(servicio.obtenerAvisoActivo).mockResolvedValue(dedicatoria);
    render(<AvisoPortada />);
    fireEvent.click(await screen.findByRole("button", { name: /entrar al sitio/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    cleanup();
    render(<AvisoPortada />);
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("vuelve a aparecer si se activa otro aviso", async () => {
    vi.mocked(servicio.obtenerAvisoActivo).mockResolvedValue(dedicatoria);
    render(<AvisoPortada />);
    fireEvent.click(await screen.findByRole("button", { name: /entrar al sitio/i }));

    cleanup();
    vi.mocked(servicio.obtenerAvisoActivo).mockResolvedValue(promocion);
    render(<AvisoPortada />);
    expect(await screen.findByRole("dialog", { name: /20% de descuento/i })).toBeInTheDocument();
  });

  it("se cierra con Escape", async () => {
    vi.mocked(servicio.obtenerAvisoActivo).mockResolvedValue(dedicatoria);
    render(<AvisoPortada />);
    const boton = await screen.findByRole("button", { name: /entrar al sitio/i });
    // El listener de Escape se registra en el mismo efecto que enfoca el botón.
    await waitFor(() => expect(boton).toHaveFocus());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
