import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NumeracionCard } from "./NumeracionCard";
import * as perfil from "../../services/perfilMedico";

vi.mock("../../services/perfilMedico");

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const presupuestos = { prefijo: "PR", nombre: "Presupuestos", serie: "PR-2026", siguiente: 1, minimo: 1 };

describe("NumeracionCard", () => {
  it("fija el próximo número de presupuesto para seguir el talonario", async () => {
    vi.mocked(perfil.listarNumeracion).mockResolvedValue([presupuestos]);
    vi.mocked(perfil.fijarSiguienteNumero).mockResolvedValue({ ...presupuestos, siguiente: 55 });
    render(<NumeracionCard />);
    const campo = await screen.findByLabelText("Próximo número de Presupuestos");
    fireEvent.change(campo, { target: { value: "55" } });
    expect(screen.getByText("Próximo: PR-2026-00055")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(perfil.fijarSiguienteNumero).toHaveBeenCalledWith("PR", 55));
    expect(await screen.findByText("El próximo saldrá como PR-2026-00055.")).toBeTruthy();
  });
});
