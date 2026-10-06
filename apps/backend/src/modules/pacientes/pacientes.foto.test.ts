import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

const dir = vi.hoisted(() => {
  const d = require("fs").mkdtempSync(require("path").join(require("os").tmpdir(), "fotos-"));
  process.env.UPLOADS_DIR = d;
  return d;
});

vi.mock("../../lib/prisma", () => ({
  prisma: { paciente: { findUnique: vi.fn(), update: vi.fn((args) => Promise.resolve({ id: "p1", ...args.data })) } },
}));
vi.mock("../correos/correos.service", () => ({}));

import { prisma } from "../../lib/prisma";
import { fotosDir, guardarFoto, quitarFoto, rutaFoto } from "./pacientes.service";

const findUnique = prisma.paciente.findUnique as unknown as ReturnType<typeof vi.fn>;
const archivo = (nombre: string) => {
  fs.writeFileSync(path.join(fotosDir, nombre), "jpg");
  return nombre;
};

beforeEach(() => vi.clearAllMocks());

describe("foto del paciente", () => {
  it("se guarda fuera de lo público, en uploads/fotos-pacientes", () => {
    expect(fotosDir).toBe(path.join(dir, "fotos-pacientes"));
  });

  it("al cambiarla borra la anterior", async () => {
    const vieja = archivo("p1-1.jpg");
    const nueva = archivo("p1-2.jpg");
    findUnique.mockResolvedValue({ id: "p1", fotoUrl: vieja });
    const actualizado = await guardarFoto("p1", nueva);
    expect(actualizado.fotoUrl).toBe(nueva);
    expect(fs.existsSync(path.join(fotosDir, vieja))).toBe(false);
    expect(fs.existsSync(path.join(fotosDir, nueva))).toBe(true);
  });

  it("si el paciente no existe, descarta el archivo subido", async () => {
    const subida = archivo("px-1.jpg");
    findUnique.mockResolvedValue(null);
    await expect(guardarFoto("px", subida)).rejects.toThrow("no encontrado");
    expect(fs.existsSync(path.join(fotosDir, subida))).toBe(false);
  });

  it("al quitarla borra el archivo y deja de servirse", async () => {
    const foto = archivo("p1-3.jpg");
    findUnique.mockResolvedValueOnce({ id: "p1", fotoUrl: foto }).mockResolvedValue({ fotoUrl: null });
    await quitarFoto("p1");
    expect(fs.existsSync(path.join(fotosDir, foto))).toBe(false);
    await expect(rutaFoto("p1")).rejects.toThrow("no tiene foto");
  });
});
