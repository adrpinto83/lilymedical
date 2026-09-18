import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renderiza el contenido", () => {
    render(<Badge color="green">Activo</Badge>);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("usa el color 'slate' por defecto cuando no se especifica", () => {
    render(<Badge>Sin color</Badge>);
    expect(screen.getByText("Sin color")).toHaveClass("bg-slate-100");
  });

  it("aplica la clase correspondiente al color indicado", () => {
    render(<Badge color="red">Vencido</Badge>);
    expect(screen.getByText("Vencido")).toHaveClass("bg-red-100");
  });
});
