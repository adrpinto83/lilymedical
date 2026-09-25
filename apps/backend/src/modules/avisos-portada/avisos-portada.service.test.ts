import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import { asegurarEditable } from "./avisos-portada.service";
import { avisoSchema } from "./avisos-portada.schema";

describe("asegurarEditable", () => {
  it("protege la dedicatoria histórica", () => {
    expect(() => asegurarEditable({ tipo: "DEDICATORIA" })).toThrow(/histórico/);
  });

  it("deja editar los avisos comerciales", () => {
    expect(() => asegurarEditable({ tipo: "COMERCIAL" })).not.toThrow();
  });
});

describe("avisoSchema", () => {
  const base = { titulo: "Promoción de octubre", mensaje: "20% en tu primera evaluación." };

  it("acepta enlaces web, anclas y rutas internas", () => {
    for (const enlaceUrl of ["https://wa.me/584246773472", "#servicios", "/registro-paciente"]) {
      expect(avisoSchema.safeParse({ ...base, enlaceUrl }).success).toBe(true);
    }
  });

  it("rechaza esquemas peligrosos en el enlace", () => {
    expect(avisoSchema.safeParse({ ...base, enlaceUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("guarda los opcionales vacíos como null", () => {
    const r = avisoSchema.parse({ ...base, etiqueta: "  ", enlaceUrl: "" });
    expect(r.etiqueta).toBeNull();
    expect(r.enlaceUrl).toBeNull();
  });
});
