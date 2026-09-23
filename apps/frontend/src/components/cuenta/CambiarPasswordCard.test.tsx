import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CambiarPasswordCard } from "./CambiarPasswordCard";
import * as servicio from "../../services/usuarios";

vi.mock("../../services/usuarios");

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function llenar(actual: string, nueva: string, confirmar: string) {
  fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: actual } });
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: nueva } });
  fireEvent.change(screen.getByLabelText("Repite la nueva contraseña"), {
    target: { value: confirmar },
  });
}

describe("CambiarPasswordCard", () => {
  it("rechaza contraseñas de menos de 8 caracteres sin llamar a la API", async () => {
    render(<CambiarPasswordCard />);
    llenar("vieja123", "corta1", "corta1");
    fireEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(servicio.cambiarMiPassword).not.toHaveBeenCalled();
  });

  it("rechaza si la confirmación no coincide", async () => {
    render(<CambiarPasswordCard />);
    llenar("vieja123", "nuevaClave2026", "nuevaClave2027");
    fireEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument();
    expect(servicio.cambiarMiPassword).not.toHaveBeenCalled();
  });

  it("envía el cambio y limpia el formulario al terminar", async () => {
    vi.mocked(servicio.cambiarMiPassword).mockResolvedValue(undefined);
    render(<CambiarPasswordCard />);
    llenar("vieja123", "nuevaClave2026", "nuevaClave2026");
    fireEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    await waitFor(() =>
      expect(servicio.cambiarMiPassword).toHaveBeenCalledWith("vieja123", "nuevaClave2026")
    );
    expect(await screen.findByText(/contraseña actualizada/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("");
  });

  it("muestra el error del servidor cuando la actual es incorrecta", async () => {
    vi.mocked(servicio.cambiarMiPassword).mockRejectedValue(new Error("x"));
    vi.spyOn(await import("../../services/api"), "getErrorMessage").mockReturnValue(
      "La contraseña actual no es correcta"
    );
    render(<CambiarPasswordCard />);
    llenar("equivocada", "nuevaClave2026", "nuevaClave2026");
    fireEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    expect(await screen.findByText("La contraseña actual no es correcta")).toBeInTheDocument();
  });
});
