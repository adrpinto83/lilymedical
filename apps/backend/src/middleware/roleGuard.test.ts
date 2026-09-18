import { describe, it, expect, vi } from "vitest";
import { roleGuard } from "./roleGuard";
import { HttpError } from "../lib/http-error";
import type { Request, Response } from "express";

function req(user?: { rol: string }): Request {
  return { user } as unknown as Request;
}

describe("roleGuard", () => {
  it("permite pasar cuando el rol del usuario está en la lista permitida", () => {
    const next = vi.fn();
    roleGuard("MEDICO", "ADMINISTRATIVO")(req({ rol: "MEDICO" }) as any, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("lanza 403 cuando el rol no está permitido", () => {
    const next = vi.fn();
    expect(() =>
      roleGuard("MEDICO")(req({ rol: "PACIENTE" }) as any, {} as Response, next)
    ).toThrow(HttpError);
    expect(next).not.toHaveBeenCalled();
  });

  it("lanza 401 cuando no hay usuario autenticado", () => {
    const next = vi.fn();
    expect(() => roleGuard("MEDICO")(req(undefined) as any, {} as Response, next)).toThrowError(
      expect.objectContaining({ status: 401 })
    );
  });
});
