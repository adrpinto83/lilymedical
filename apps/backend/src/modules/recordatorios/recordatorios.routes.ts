import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { enviarRecordatoriosPendientes } from "./recordatorios.service";
import { enviarFelicitacionesCumpleanos, listarCumpleanerosDeHoy } from "../correos/correos.service";

const router = Router();

router.use(requireAuth, roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"));

// Envío manual/inmediato, además del cron automático (ver recordatorios.job.ts).
// Útil para probar la configuración de SMTP o adelantar el envío del día.
router.post("/enviar", async (_req, res) => {
  const resultado = await enviarRecordatoriosPendientes();
  res.json(resultado);
});

// Quién cumple años hoy y si ya se le felicitó.
router.get("/cumpleanos", async (_req, res) => {
  res.json(await listarCumpleanerosDeHoy());
});

// Envío inmediato de las felicitaciones pendientes de hoy (además del job).
router.post("/cumpleanos/enviar", async (_req, res) => {
  res.json(await enviarFelicitacionesCumpleanos());
});

export default router;
