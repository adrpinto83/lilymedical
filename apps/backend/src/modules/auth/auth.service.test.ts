import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma";
import { login } from "./auth.service";
import { HttpError } from "../../lib/http-error";

const usuarioBase = {
  id: "u1",
  nombre: "Lilia",
  apellido: "Figuera",
  email: "medico@lilymedical.com",
  passwordHash: "",
  rol: "MEDICO" as const,
  activo: true,
  intentosFallidos: 0,
  bloqueadoHasta: null as Date | null,
};

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = "test-secret";
  process.env.LOGIN_MAX_INTENTOS = "3";
  process.env.LOGIN_BLOQUEO_MINUTOS = "15";
  usuarioBase.passwordHash = await bcrypt.hash("correcta123", 10);
});

describe("auth.service.login", () => {
  it("inicia sesión con credenciales correctas y resetea intentos previos", async () => {
    const usuario = { ...usuarioBase, intentosFallidos: 2 };
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(usuario as any);

    const resultado = await login({ email: usuario.email, password: "correcta123" });

    expect(resultado.token).toBeTypeOf("string");
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: usuario.id },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    });
  });

  it("rechaza contraseña incorrecta e incrementa el contador de intentos", async () => {
    const usuario = { ...usuarioBase, intentosFallidos: 1 };
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(usuario as any);

    await expect(login({ email: usuario.email, password: "mala" })).rejects.toThrow(HttpError);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: usuario.id },
      data: { intentosFallidos: 2, bloqueadoHasta: null },
    });
  });

  it("bloquea la cuenta al alcanzar LOGIN_MAX_INTENTOS", async () => {
    const usuario = { ...usuarioBase, intentosFallidos: 2 }; // siguiente falla llega a 3 (el máximo configurado)
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(usuario as any);

    await expect(login({ email: usuario.email, password: "mala" })).rejects.toMatchObject({
      status: 423,
    });

    const llamada = vi.mocked(prisma.usuario.update).mock.calls[0][0] as any;
    expect(llamada.data.intentosFallidos).toBe(0);
    expect(llamada.data.bloqueadoHasta).toBeInstanceOf(Date);
  });

  it("rechaza el login mientras la cuenta esté bloqueada, incluso con la contraseña correcta", async () => {
    const usuario = { ...usuarioBase, bloqueadoHasta: new Date(Date.now() + 5 * 60000) };
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(usuario as any);

    await expect(login({ email: usuario.email, password: "correcta123" })).rejects.toMatchObject({
      status: 423,
    });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it("permite el login una vez expirado el bloqueo", async () => {
    const usuario = { ...usuarioBase, bloqueadoHasta: new Date(Date.now() - 1000), intentosFallidos: 3 };
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(usuario as any);

    const resultado = await login({ email: usuario.email, password: "correcta123" });
    expect(resultado.token).toBeTypeOf("string");
  });

  it("rechaza con mensaje genérico si el usuario no existe", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);

    await expect(login({ email: "nadie@x.com", password: "correcta123" })).rejects.toMatchObject({
      status: 401,
    });
  });
});
