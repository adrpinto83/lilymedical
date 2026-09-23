import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act, within } from "@testing-library/react";
import { Carrusel, FotoCarrusel } from "./Carrusel";
import { descripcionDesdeNombre } from "./fotos";

const fotos: FotoCarrusel[] = [
  { url: "/a.jpg", alt: "Terapia de hombro" },
  { url: "/b.jpg", alt: "Consultorio en Novocentro" },
  { url: "/c.jpg", alt: "Ejercicios de columna" },
];

function pista(): HTMLElement {
  return document.querySelector(".flex.transition-transform") as HTMLElement;
}

afterEach(cleanup);

describe("Carrusel", () => {
  it("muestra todas las fotos y arranca en la primera", () => {
    render(<Carrusel fotos={fotos} etiqueta="Fotos" />);
    for (const foto of fotos) expect(screen.getByAltText(foto.alt)).toBeInTheDocument();
    expect(pista()).toHaveStyle({ transform: "translateX(-0%)" });
  });

  it("avanza y retrocede con los botones, dando la vuelta al final", () => {
    render(<Carrusel fotos={fotos} etiqueta="Fotos" />);
    const siguiente = screen.getByRole("button", { name: /foto siguiente/i });

    fireEvent.click(siguiente);
    expect(pista()).toHaveStyle({ transform: "translateX(-100%)" });

    fireEvent.click(screen.getByRole("button", { name: /foto anterior/i }));
    expect(pista()).toHaveStyle({ transform: "translateX(-0%)" });

    fireEvent.click(screen.getByRole("button", { name: /foto anterior/i }));
    expect(pista()).toHaveStyle({ transform: "translateX(-200%)" });
  });

  it("salta a una foto concreta desde las miniaturas y marca la activa", () => {
    render(<Carrusel fotos={fotos} etiqueta="Fotos" />);
    const miniatura = screen.getByRole("button", {
      name: "Ir a la foto 3 de 3: Ejercicios de columna",
    });
    fireEvent.click(miniatura);

    expect(pista()).toHaveStyle({ transform: "translateX(-200%)" });
    expect(miniatura).toHaveAttribute("aria-current", "true");
  });

  it("lleva la cuenta de la foto que se está viendo", () => {
    render(<Carrusel fotos={fotos} etiqueta="Fotos" />);
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /foto siguiente/i }));
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it("amplía la foto en un diálogo y lo cierra con Escape", () => {
    render(<Carrusel fotos={fotos} etiqueta="Fotos" />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /ampliar la foto/i }));
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(within(dialogo).getByAltText("Terapia de hombro")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("detiene el paso automático mientras la foto está ampliada", () => {
    vi.useFakeTimers();
    try {
      render(<Carrusel fotos={fotos} etiqueta="Fotos" />);
      fireEvent.click(screen.getByRole("button", { name: /ampliar la foto/i }));

      act(() => void vi.advanceTimersByTime(15000));
      expect(pista()).toHaveStyle({ transform: "translateX(-0%)" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("responde a las flechas del teclado", () => {
    render(<Carrusel fotos={fotos} etiqueta="Fotos" />);
    const region = screen.getByRole("group", { name: "Fotos" });

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(pista()).toHaveStyle({ transform: "translateX(-100%)" });

    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(pista()).toHaveStyle({ transform: "translateX(-0%)" });
  });

  it("pasa solo y el botón de pausa lo detiene", () => {
    vi.useFakeTimers();
    try {
      render(<Carrusel fotos={fotos} etiqueta="Fotos" />);

      act(() => void vi.advanceTimersByTime(5000));
      expect(pista()).toHaveStyle({ transform: "translateX(-100%)" });

      fireEvent.click(screen.getByRole("button", { name: /pausar/i }));
      act(() => void vi.advanceTimersByTime(15000));
      expect(pista()).toHaveStyle({ transform: "translateX(-100%)" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("oculta los controles cuando solo hay una foto", () => {
    render(<Carrusel fotos={[fotos[0]]} etiqueta="Fotos" />);
    expect(screen.queryByRole("button", { name: /foto siguiente/i })).toBeNull();
  });

  it("no dibuja nada sin fotos", () => {
    const { container } = render(<Carrusel fotos={[]} etiqueta="Fotos" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("descripcionDesdeNombre", () => {
  it("convierte el nombre del archivo en un pie de foto legible", () => {
    expect(descripcionDesdeNombre("../../assets/instagram/01-terapia-de-hombro.jpg")).toBe(
      "Terapia de hombro"
    );
    expect(descripcionDesdeNombre("02_consultorio_en_novocentro.webp")).toBe(
      "Consultorio en novocentro"
    );
    expect(descripcionDesdeNombre("03.png")).toBe("Fotografía del consultorio");
  });
});
