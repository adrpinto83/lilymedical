import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
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

describe("redirección de www", () => {
  const app = createApp();

  // fetch no permite cambiar el encabezado Host, por eso se usa http directo.
  function pedir(host: string, ruta: string) {
    const servidor = app.listen(0);
    const { port } = servidor.address() as { port: number };
    return new Promise<{ status: number; location?: string }>((resolve, reject) => {
      http
        .get({ port, path: ruta, headers: { host } }, (res) => {
          res.resume();
          resolve({ status: res.statusCode ?? 0, location: res.headers.location });
        })
        .on("error", reject);
    }).finally(() => servidor.close());
  }

  it("manda www al dominio principal con 301, conservando la ruta", async () => {
    const res = await pedir("www.lilymedical.com.ve", "/login?x=1");
    expect(res.status).toBe(301);
    expect(res.location).toBe("https://lilymedical.com.ve/login?x=1");
  });

  it("no toca el dominio principal", async () => {
    const res = await pedir("lilymedical.com.ve", "/health");
    expect(res.status).toBe(200);
  });
});

describe("portada pregenerada", () => {
  function pedirTexto(app: ReturnType<typeof createApp>, ruta: string) {
    const servidor = app.listen(0);
    const { port } = servidor.address() as { port: number };
    return new Promise<string>((resolve, reject) => {
      http
        .get({ port, path: ruta }, (res) => {
          let cuerpo = "";
          res.on("data", (trozo) => (cuerpo += trozo));
          res.on("end", () => resolve(cuerpo));
        })
        .on("error", reject);
    }).finally(() => servidor.close());
  }

  it("entrega portada.html en / y el index vacío en las rutas del SPA", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lily-front-"));
    fs.writeFileSync(path.join(dir, "index.html"), "SPA vacío");
    fs.writeFileSync(path.join(dir, "portada.html"), "portada escrita");
    vi.stubEnv("FRONTEND_DIR", dir);
    try {
      const app = createApp();
      expect(await pedirTexto(app, "/")).toBe("portada escrita");
      expect(await pedirTexto(app, "/login")).toBe("SPA vacío");
    } finally {
      vi.unstubAllEnvs();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
