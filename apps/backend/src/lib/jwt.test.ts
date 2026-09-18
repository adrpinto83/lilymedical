import { describe, it, expect, beforeEach } from "vitest";
import { signToken, verifyToken } from "./jwt";

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "1h";
});

describe("jwt", () => {
  it("firma y verifica un token, preservando el payload", () => {
    const payload = { sub: "u1", email: "a@b.com", rol: "MEDICO" as const, nombre: "Ana" };
    const token = signToken(payload);
    const decoded = verifyToken(token);

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.rol).toBe(payload.rol);
    expect(decoded.nombre).toBe(payload.nombre);
  });

  it("rechaza un token alterado", () => {
    const token = signToken({ sub: "u1", email: "a@b.com", rol: "MEDICO" as const, nombre: "Ana" });
    expect(() => verifyToken(token + "x")).toThrow();
  });

  it("falla al firmar si no hay JWT_SECRET configurado", () => {
    delete process.env.JWT_SECRET;
    expect(() => signToken({ sub: "u1", email: "a@b.com", rol: "MEDICO" as const, nombre: "Ana" })).toThrow();
  });
});
