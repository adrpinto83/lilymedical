import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { auditLog } from "../../middleware/auditLog";
import { actualizarHistoriaSchema, crearEvaluacionSchema } from "./historias-clinicas.schema";
import * as historiasService from "./historias-clinicas.service";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { generarHistoriaClinicaPdf } from "./historias-clinicas.pdf";

const router = Router();

// Solo personal MÉDICO accede al detalle clínico. El staff administrativo
// queda fuera de todo este router (ver requisitos de privacidad).
router.use(requireAuth, roleGuard("MEDICO"));

router.get(
  "/paciente/:pacienteId",
  auditLog("VER"),
  async (req, res) => {
    const historia = await historiasService.obtenerHistoriaPorPaciente(req.params.pacienteId);
    res.json(historia);
  }
);

router.get("/paciente/:pacienteId/linea-tiempo", auditLog("VER"), async (req, res) => {
  const eventos = await historiasService.obtenerLineaDeTiempo(req.params.pacienteId);
  res.json(eventos);
});

router.get("/paciente/:pacienteId/pdf", auditLog("VER"), async (req, res) => {
  const historia = await historiasService.obtenerHistoriaParaPdf(req.params.pacienteId);
  const membrete = await construirMembrete(req.user!.sub);
  const doc = crearDocumentoPdf();
  enviarPdfComoRespuesta(doc, res, `historia-clinica-${historia.paciente.documento}.pdf`);
  await generarHistoriaClinicaPdf(doc, historia, membrete);
  doc.end();
});

router.put(
  "/paciente/:pacienteId",
  auditLog("EDITAR"),
  validateBody(actualizarHistoriaSchema),
  async (req, res) => {
    const historia = await historiasService.actualizarHistoria(req.params.pacienteId, req.body);
    res.json(historia);
  }
);

router.post(
  "/paciente/:pacienteId/evaluaciones",
  auditLog("CREAR"),
  validateBody(crearEvaluacionSchema),
  async (req, res) => {
    const evaluacion = await historiasService.agregarEvaluacion(
      req.params.pacienteId,
      req.user!.sub,
      req.body
    );
    res.status(201).json(evaluacion);
  }
);

export default router;
