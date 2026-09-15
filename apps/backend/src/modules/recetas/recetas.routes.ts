import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { auditLog } from "../../middleware/auditLog";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { crearRecetaSchema } from "./recetas.schema";
import * as recetasService from "./recetas.service";
import { generarRecetaPdf } from "./recetas.pdf";

const router = Router();

// Recetas: contenido clínico, solo MEDICO
router.use(requireAuth, roleGuard("MEDICO"));

router.get("/paciente/:pacienteId", auditLog("VER"), async (req, res) => {
  const recetas = await recetasService.listarRecetasPorPaciente(req.params.pacienteId);
  res.json(recetas);
});

router.post("/", auditLog("CREAR"), validateBody(crearRecetaSchema), async (req, res) => {
  const receta = await recetasService.crearReceta(req.user!.sub, req.body);
  res.status(201).json(receta);
});

router.get("/:id/pdf", auditLog("VER"), async (req, res) => {
  const receta = await recetasService.obtenerRecetaParaPdf(req.params.id);
  const membrete = await construirMembrete(receta.medicoId);
  const doc = crearDocumentoPdf("MEDIA_CARTA");
  enviarPdfComoRespuesta(doc, res, `${receta.numeroReceta}.pdf`);
  await generarRecetaPdf(doc, receta, membrete);
  doc.end();
});

export default router;
