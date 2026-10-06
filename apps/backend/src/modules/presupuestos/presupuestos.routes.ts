import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { obtenerMedicoTitular } from "../correos/correos.service";
import { crearPresupuestoSchema } from "./presupuestos.schema";
import * as presupuestosService from "./presupuestos.service";
import { generarPresupuestoPdf } from "./presupuestos.pdf";

const router = Router();

// Igual que facturación: lo emiten el médico y el personal administrativo.
router.use(requireAuth, roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"));

router.get("/", async (req, res) => {
  const { pacienteId, q } = req.query;
  res.json(
    await presupuestosService.listarPresupuestos({
      pacienteId: pacienteId ? String(pacienteId) : undefined,
      q: q ? String(q).trim() || undefined : undefined,
    })
  );
});

router.post("/", validateBody(crearPresupuestoSchema), async (req, res) => {
  res.status(201).json(await presupuestosService.crearPresupuesto(req.user!.sub, req.body));
});

router.post("/:id/anular", async (req, res) => {
  res.json(await presupuestosService.anularPresupuesto(req.params.id));
});

router.get("/:id/pdf", async (req, res) => {
  const presupuesto = await presupuestosService.obtenerPresupuestoParaPdf(req.params.id);
  // Membrete y firma siempre del médico, aunque lo emita la secretaria.
  const medicoId = req.user!.rol === "MEDICO" ? req.user!.sub : (await obtenerMedicoTitular()).id;
  const membrete = await construirMembrete(medicoId);
  const doc = crearDocumentoPdf("CARTA");
  enviarPdfComoRespuesta(doc, res, `presupuesto-${presupuesto.numeroPresupuesto}.pdf`);
  await generarPresupuestoPdf(doc, presupuesto, membrete);
  doc.end();
});

export default router;
