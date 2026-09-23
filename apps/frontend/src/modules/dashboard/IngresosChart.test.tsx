import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngresosChart } from "./IngresosChart";
import { escalaLimpia, variacion } from "./formato";

describe("escalaLimpia", () => {
  it("redondea el tope a un valor limpio", () => {
    expect(escalaLimpia(870)).toEqual({ tope: 1000, ticks: [0, 500, 1000] });
    expect(escalaLimpia(1234)).toEqual({ tope: 1500, ticks: [0, 500, 1000, 1500] });
  });
});

describe("variacion", () => {
  it("devuelve null si no hay base de comparación", () => {
    expect(variacion(100, 0)).toBeNull();
    expect(variacion(150, 100)).toBe(50);
    expect(variacion(50, 100)).toBe(-50);
  });
});

describe("IngresosChart", () => {
  const datos = [
    { mes: "2026-08", total: "400.00" },
    { mes: "2026-09", total: "250.00" },
  ];

  it("muestra el monto del mes en el tooltip al pasar el mouse", async () => {
    render(<IngresosChart datos={datos} />);
    await userEvent.hover(screen.getByLabelText(/agosto 2026/i));
    expect(screen.getByRole("tooltip")).toHaveTextContent("$400,00");
  });

  it("muestra un mensaje en lugar del gráfico si no hay ingresos", () => {
    render(<IngresosChart datos={[{ mes: "2026-09", total: "0.00" }]} />);
    expect(screen.getByText(/aún no hay pagos/i)).toBeInTheDocument();
  });
});
