import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { usuario } = vi.hoisted(() => ({
  usuario: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
}));
vi.mock("../../lib/prisma", () => ({ prisma: { usuario } }));

import { eliminarUsuario, emailArchivado } from "./usuarios.service";

const base = { id: "u2", rol: "ADMINISTRATIVO", eliminadoEn: null };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("eliminarUsuario", () => {
  it("no deja eliminarse a uno mismo", async () => {
    await expect(eliminarUsuario("u1", "u1")).rejects.toThrow(/propia cuenta/);
  });

  it("protege al administrador del sistema", async () => {
    usuario.findUnique.mockResolvedValue({ ...base, rol: "ADMIN" });
    await expect(eliminarUsuario("u2", "u1")).rejects.toThrow(/no se puede eliminar/);
    expect(usuario.delete).not.toHaveBeenCalled();
  });

  it("no toca cuentas de pacientes ni ya eliminadas", async () => {
    usuario.findUnique.mockResolvedValue({ ...base, rol: "PACIENTE" });
    await expect(eliminarUsuario("u2", "u1")).rejects.toThrow(/no encontrado/);
    usuario.findUnique.mockResolvedValue({ ...base, eliminadoEn: new Date() });
    await expect(eliminarUsuario("u2", "u1")).rejects.toThrow(/no encontrado/);
  });

  it("borra de verdad a quien no tiene historial", async () => {
    usuario.findUnique.mockResolvedValue(base);
    usuario.delete.mockResolvedValue(base);
    await expect(eliminarUsuario("u2", "u1")).resolves.toBe("eliminado");
    expect(usuario.update).not.toHaveBeenCalled();
  });

  it("da de baja lógica a quien tiene historial, liberando el email", async () => {
    usuario.findUnique.mockResolvedValue({ ...base, rol: "MEDICO" });
    usuario.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003", clientVersion: "5" })
    );
    await expect(eliminarUsuario("u2", "u1")).resolves.toBe("archivado");
    const { data } = usuario.update.mock.calls[0][0];
    expect(data).toMatchObject({ activo: false, email: emailArchivado("u2"), passwordHash: "!" });
    expect(data.eliminadoEn).toBeInstanceOf(Date);
  });

  it("no oculta otros errores de la base de datos", async () => {
    usuario.findUnique.mockResolvedValue(base);
    usuario.delete.mockRejectedValue(new Error("conexión perdida"));
    await expect(eliminarUsuario("u2", "u1")).rejects.toThrow("conexión perdida");
  });
});
