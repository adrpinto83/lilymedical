import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { auditLog } from "../../middleware/auditLog";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { crearConstanciaSchema } from "./constancias.schema";
import * as constanciasService from "./constancias.service";
import { generarConstanciaPdf } from "./constancias.pdf";

const router = Router();

// Constancias médicas: contenido clínico, solo MEDICO
router.use(requireAuth, roleGuard("MEDICO"));

router.get("/paciente/:pacienteId", auditLog("VER"), async (req, res) => {
  const constancias = await constanciasService.listarConstanciasPorPaciente(req.params.pacienteId);
  res.json(constancias);
});

router.post("/", auditLog("CREAR"), validateBody(crearConstanciaSchema), async (req, res) => {
  const constancia = await constanciasService.crearConstancia(req.user!.sub, req.body);
  res.status(201).json(constancia);
});

router.get("/:id/pdf", auditLog("VER"), async (req, res) => {
  const constancia = await constanciasService.obtenerConstanciaParaPdf(req.params.id);
  const membrete = await construirMembrete(constancia.medicoId);
  const doc = crearDocumentoPdf("MEDIA_CARTA");
  enviarPdfComoRespuesta(doc, res, `${constancia.numeroConstancia}.pdf`);
  await generarConstanciaPdf(doc, constancia, membrete);
  doc.end();
});

export default router;
