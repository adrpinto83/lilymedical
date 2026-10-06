import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { auditLog } from "../../middleware/auditLog";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { crearInformeSchema } from "./informes-medicos.schema";
import * as informesService from "./informes-medicos.service";
import { generarInformeMedicoPdf } from "./informes-medicos.pdf";

const router = Router();

// Informes médicos: acto médico, solo MEDICO (igual que las constancias).
router.use(requireAuth, roleGuard("MEDICO"));

router.get("/paciente/:pacienteId", auditLog("VER"), async (req, res) => {
  res.json(await informesService.listarInformesPorPaciente(req.params.pacienteId));
});

router.post("/", auditLog("CREAR"), validateBody(crearInformeSchema), async (req, res) => {
  res.status(201).json(await informesService.crearInforme(req.user!.sub, req.body));
});

router.get("/:id/pdf", auditLog("VER"), async (req, res) => {
  const informe = await informesService.obtenerInformeParaPdf(req.params.id);
  const membrete = await construirMembrete(informe.medicoId);
  const doc = crearDocumentoPdf("MEDIA_CARTA");
  enviarPdfComoRespuesta(doc, res, `${informe.numeroInforme}.pdf`);
  await generarInformeMedicoPdf(doc, informe, membrete);
  doc.end();
});

export default router;
