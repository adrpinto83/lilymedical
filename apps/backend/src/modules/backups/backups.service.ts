import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { HttpError } from "../../lib/http-error";

const execFileAsync = promisify(execFile);

const PREFIJO = "lilymedical-";
const EXTENSION = ".dump";
const NOMBRE_REGEX = /^lilymedical-\d{8}T\d{6}\.dump$/;

export interface BackupInfo {
  archivo: string;
  tamanioBytes: number;
  creadoEn: Date;
}

function directorioBackups(): string {
  return path.resolve(process.cwd(), process.env.BACKUP_DIR || "backups");
}

function retencionDias(): number {
  const valor = Number(process.env.BACKUP_RETENCION_DIAS);
  return Number.isFinite(valor) && valor > 0 ? valor : 30;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "");
}

// Ejecuta pg_dump contra DATABASE_URL y deja el volcado (formato custom,
// comprimido y restaurable con pg_restore) en BACKUP_DIR. Requiere que el
// binario pg_dump (paquete postgresql-client) esté disponible en el servidor.
export async function crearBackup(): Promise<BackupInfo> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new HttpError(500, "DATABASE_URL no está configurado");
  }

  const dir = directorioBackups();
  await fs.mkdir(dir, { recursive: true });

  const archivo = `${PREFIJO}${timestamp()}${EXTENSION}`;
  const rutaCompleta = path.join(dir, archivo);

  try {
    await execFileAsync("pg_dump", ["--dbname", databaseUrl, "-Fc", "-f", rutaCompleta]);
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      throw new HttpError(
        500,
        "pg_dump no está instalado en el servidor. Instala el paquete postgresql-client para habilitar los backups."
      );
    }
    throw new HttpError(500, `No se pudo generar el backup: ${nodeErr.message}`);
  }

  await limpiarBackupsAntiguos();

  const stat = await fs.stat(rutaCompleta);
  return { archivo, tamanioBytes: stat.size, creadoEn: stat.birthtime };
}

export async function listarBackups(): Promise<BackupInfo[]> {
  const dir = directorioBackups();
  let nombres: string[];
  try {
    nombres = await fs.readdir(dir);
  } catch {
    return [];
  }

  const backups = await Promise.all(
    nombres
      .filter((nombre) => NOMBRE_REGEX.test(nombre))
      .map(async (archivo) => {
        const stat = await fs.stat(path.join(dir, archivo));
        return { archivo, tamanioBytes: stat.size, creadoEn: stat.birthtime };
      })
  );

  return backups.sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
}

// Borra backups con más de BACKUP_RETENCION_DIAS de antigüedad. Se corre
// automáticamente después de cada backup nuevo, además del cron programado.
export async function limpiarBackupsAntiguos(): Promise<number> {
  const dir = directorioBackups();
  const limite = Date.now() - retencionDias() * 24 * 60 * 60 * 1000;

  let nombres: string[];
  try {
    nombres = await fs.readdir(dir);
  } catch {
    return 0;
  }

  let borrados = 0;
  for (const nombre of nombres) {
    if (!NOMBRE_REGEX.test(nombre)) continue;
    const ruta = path.join(dir, nombre);
    const stat = await fs.stat(ruta);
    if (stat.birthtime.getTime() < limite) {
      await fs.unlink(ruta);
      borrados++;
    }
  }
  return borrados;
}

// Valida que el nombre de archivo pedido para descarga sea uno de los
// backups generados por este sistema (evita path traversal y acceso a
// archivos fuera de BACKUP_DIR).
export function rutaBackupSeguro(archivo: string): string {
  if (!NOMBRE_REGEX.test(archivo)) {
    throw new HttpError(400, "Nombre de archivo de backup inválido");
  }
  return path.join(directorioBackups(), archivo);
}
