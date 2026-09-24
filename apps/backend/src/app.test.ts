import { describe, it, expect, vi } from "vitest";

vi.mock("./lib/prisma", () => ({ prisma: {} }));

import { createApp } from "./app";

// Express resuelve req.ip recorriendo X-Forwarded-For de derecha a izquierda
// mientras el salto sea de confianza: solo el proxy local debe serlo, para que
// una IP inventada por el cliente al inicio del encabezado no se tome como real.
describe("trust proxy", () => {
  const confia = createApp().get("trust proxy fn") as (ip: string, salto: number) => boolean;

  it("confía en el proxy local (cloudflared/nginx en loopback)", () => {
    expect(confia("127.0.0.1", 0)).toBe(true);
    expect(confia("::1", 0)).toBe(true);
  });

  it("no confía en IPs públicas, así req.ip queda en la del cliente", () => {
    expect(confia("190.202.1.10", 1)).toBe(false);
  });
});
