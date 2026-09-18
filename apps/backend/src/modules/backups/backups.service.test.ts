import { describe, it, expect, vi, beforeEach } from "vitest";

const { execFileMock, fsMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  fsMock: {
    mkdir: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock("child_process", () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));
vi.mock("fs/promises", () => ({ default: fsMock }));

import { crearBackup, listarBackups, limpiarBackupsAntiguos, rutaBackupSeguro } from "./backups.service";
import { HttpError } from "../../lib/http-error";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
  process.env.BACKUP_DIR = "backups";
  process.env.BACKUP_RETENCION_DIAS = "30";
  fsMock.mkdir.mockResolvedValue(undefined);
  fsMock.readdir.mockResolvedValue([]);
});

describe("backups.service.crearBackup", () => {
  it("ejecuta pg_dump y devuelve la info del archivo generado", async () => {
    execFileMock.mockImplementation((_file, _args, cb) => cb(null, "", ""));
    fsMock.stat.mockResolvedValue({ size: 1234, birthtime: new Date("2026-01-01") });

    const backup = await crearBackup();

    expect(execFileMock).toHaveBeenCalledWith(
      "pg_dump",
      expect.arrayContaining(["--dbname", process.env.DATABASE_URL, "-Fc"]),
      expect.any(Function)
    );
    expect(backup.tamanioBytes).toBe(1234);
    expect(backup.archivo).toMatch(/^lilymedical-\d{8}T\d{6}\.dump$/);
  });

  it("lanza un error claro si pg_dump no está instalado", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    execFileMock.mockImplementation((_file, _args, cb) => cb(enoent));

    await expect(crearBackup()).rejects.toThrow(/pg_dump no está instalado/);
  });

  it("exige DATABASE_URL configurado", async () => {
    delete process.env.DATABASE_URL;
    await expect(crearBackup()).rejects.toThrow(HttpError);
  });
});

describe("backups.service.listarBackups", () => {
  it("ignora archivos que no siguen el patrón de nombre de backup", async () => {
    fsMock.readdir.mockResolvedValue(["lilymedical-20260101T000000.dump", "otro.txt", ".gitkeep"]);
    fsMock.stat.mockResolvedValue({ size: 10, birthtime: new Date() });

    const backups = await listarBackups();
    expect(backups).toHaveLength(1);
    expect(backups[0].archivo).toBe("lilymedical-20260101T000000.dump");
  });

  it("devuelve lista vacía si el directorio no existe", async () => {
    fsMock.readdir.mockRejectedValue(Object.assign(new Error("no existe"), { code: "ENOENT" }));
    expect(await listarBackups()).toEqual([]);
  });
});

describe("backups.service.limpiarBackupsAntiguos", () => {
  it("borra solo los backups más viejos que la retención configurada", async () => {
    const viejo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const reciente = new Date();
    fsMock.readdir.mockResolvedValue(["lilymedical-viejo.dump", "lilymedical-reciente.dump"]);
    // El regex de nombre exige el formato exacto; usamos nombres válidos abajo.
    fsMock.readdir.mockResolvedValue([
      "lilymedical-20250101T000000.dump",
      "lilymedical-20260101T000000.dump",
    ]);
    fsMock.stat.mockImplementation((ruta: string) =>
      Promise.resolve({ birthtime: ruta.includes("20250101") ? viejo : reciente, size: 1 })
    );

    const borrados = await limpiarBackupsAntiguos();

    expect(borrados).toBe(1);
    expect(fsMock.unlink).toHaveBeenCalledTimes(1);
    expect(fsMock.unlink).toHaveBeenCalledWith(expect.stringContaining("20250101"));
  });
});

describe("backups.service.rutaBackupSeguro", () => {
  it("acepta nombres de archivo con el formato esperado", () => {
    expect(() => rutaBackupSeguro("lilymedical-20260101T000000.dump")).not.toThrow();
  });

  it("rechaza intentos de path traversal u otros nombres", () => {
    expect(() => rutaBackupSeguro("../../etc/passwd")).toThrow(HttpError);
    expect(() => rutaBackupSeguro("cualquier-cosa.dump")).toThrow(HttpError);
  });
});
