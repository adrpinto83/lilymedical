import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Dedicatoria } from "./Dedicatoria";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("Dedicatoria", () => {
  it("se muestra al entrar, firmada por AP", () => {
    render(<Dedicatoria />);
    expect(screen.getByRole("dialog", { name: /feliz cumpleaños/i })).toBeInTheDocument();
    expect(screen.getByText(/— AP/)).toBeInTheDocument();
  });

  it("se cierra con el botón y no vuelve a aparecer en la misma sesión", () => {
    render(<Dedicatoria />);
    fireEvent.click(screen.getByRole("button", { name: /entrar al sitio/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    cleanup();
    render(<Dedicatoria />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se cierra con Escape", () => {
    render(<Dedicatoria />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
