import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("asocia el label al campo mediante el id", () => {
    render(<Input id="email" label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("muestra el mensaje de error y no el hint cuando hay error", () => {
    render(<Input id="email" label="Email" hint="Ayuda" error="Requerido" />);
    expect(screen.getByText("Requerido")).toBeInTheDocument();
    expect(screen.queryByText("Ayuda")).not.toBeInTheDocument();
  });

  it("permite escribir en el campo", async () => {
    const user = userEvent.setup();
    render(<Input id="nombre" label="Nombre" />);
    const campo = screen.getByLabelText("Nombre");
    await user.type(campo, "Lilia");
    expect(campo).toHaveValue("Lilia");
  });
});
