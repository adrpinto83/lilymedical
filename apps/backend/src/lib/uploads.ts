import fs from "fs";
import path from "path";

// Resuelto desde cwd (no __dirname) para que funcione igual en dev y en
// producción, igual que LOGO_PATH en lib/pdf.ts.
export const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR || "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export function rutaAbsolutaAdjunto(rutaArchivo: string): string {
  return path.join(uploadsDir, rutaArchivo);
}
