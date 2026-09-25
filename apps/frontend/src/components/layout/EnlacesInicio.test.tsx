import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { LoginPage } from "../../modules/auth/LoginPage";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));

const medico = { id: "u1", nombre: "Lilia", apellido: "Figuera", email: "l@x.com", rol: "MEDICO" as const };

function sesion(user: typeof medico | null) {
  vi.mocked(useAuth).mockReturnValue({ user, login: vi.fn(), logout: vi.fn(), loading: false } as never);
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("enlaces a la página de inicio", () => {
  it("el panel tiene el logo y un enlace 'Sitio web' hacia la landing", () => {
    sesion(medico);
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /ir a la página de inicio/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /sitio web/i })).toHaveAttribute("href", "/");
  });

  it("el login ofrece volver a la página de inicio", () => {
    sesion(null);
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /volver a la página de inicio/i })).toHaveAttribute("href", "/");
  });

  it("quien ya tiene sesión y entra al login va directo a su panel", () => {
    sesion(medico);
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<p>Panel</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Panel")).toBeInTheDocument();
  });
});
