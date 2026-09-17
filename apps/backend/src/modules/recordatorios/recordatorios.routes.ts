import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { enviarRecordatoriosPendientes } from "./recordatorios.service";

const router = Router();

router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO"));

// Envío manual/inmediato, además del cron automático (ver recordatorios.job.ts).
// Útil para probar la configuración de SMTP o adelantar el envío del día.
router.post("/enviar", async (_req, res) => {
  const resultado = await enviarRecordatoriosPendientes();
  res.json(resultado);
});

export default router;
