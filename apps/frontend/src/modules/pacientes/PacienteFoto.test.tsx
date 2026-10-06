import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { PacienteFoto } from "./PacienteFoto";
import * as pacientes from "../../services/pacientes";
import type { Paciente } from "../../types";

vi.mock("../../services/pacientes");
vi.mock("./recortarFoto", () => ({ recortarFoto: vi.fn().mockResolvedValue(new Blob(["jpg"], { type: "image/jpeg" })) }));

const paciente = { id: "p1", nombres: "Adrian", apellidos: "Pinto", fotoUrl: null } as Paciente;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PacienteFoto", () => {
  it("sin foto muestra las iniciales y no pide nada al servidor", () => {
    render(<PacienteFoto paciente={paciente} />);
    expect(screen.getByText("AP")).toBeTruthy();
    expect(pacientes.obtenerFotoPaciente).not.toHaveBeenCalled();
  });

  it("con foto la descarga con la sesión iniciada", async () => {
    vi.mocked(pacientes.obtenerFotoPaciente).mockResolvedValue(new Blob(["x"]));
    globalThis.URL.createObjectURL = vi.fn(() => "blob:foto");
    globalThis.URL.revokeObjectURL = vi.fn();
    const { container } = render(<PacienteFoto paciente={{ ...paciente, fotoUrl: "p1-1.jpg" }} />);
    await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("blob:foto"));
    expect(pacientes.obtenerFotoPaciente).toHaveBeenCalledWith("p1");
  });

  it("el personal sube la foto recortada y avisa del cambio", async () => {
    const onCambio = vi.fn();
    vi.mocked(pacientes.subirFotoPaciente).mockResolvedValue({ ...paciente, fotoUrl: "p1-2.jpg" });
    render(<PacienteFoto paciente={paciente} editable onCambio={onCambio} />);
    fireEvent.click(screen.getByRole("button", { name: /Foto del paciente/ }));
    expect(screen.getByText("Agregar foto")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Elegir foto"), {
      target: { files: [new File(["x"], "foto.heic", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ fotoUrl: "p1-2.jpg" })));
    expect(pacientes.subirFotoPaciente).toHaveBeenCalledWith("p1", expect.any(Blob));
  });

  it("sin permiso de edición no ofrece cambiarla", () => {
    render(<PacienteFoto paciente={paciente} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver foto del paciente" }));
    expect(screen.queryByText("Agregar foto")).toBeNull();
  });
});
