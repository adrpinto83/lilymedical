import { Router } from "express";
import fs from "fs/promises";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { HttpError } from "../../lib/http-error";
import * as backupsService from "./backups.service";

const router = Router();

router.use(requireAuth, roleGuard("MEDICO"));

router.get("/", async (_req, res) => {
  const backups = await backupsService.listarBackups();
  res.json(backups);
});

// Genera un backup fuera del horario programado (ver backups.job.ts).
router.post("/ejecutar", async (_req, res) => {
  const backup = await backupsService.crearBackup();
  res.status(201).json(backup);
});

router.get("/:archivo/descargar", async (req, res) => {
  const ruta = backupsService.rutaBackupSeguro(req.params.archivo);
  try {
    await fs.access(ruta);
  } catch {
    throw new HttpError(404, "Backup no encontrado");
  }
  res.download(ruta, req.params.archivo);
});

export default router;
