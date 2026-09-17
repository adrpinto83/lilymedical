import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { generarRecetaPdf } from "../recetas/recetas.pdf";
import { generarConstanciaPdf } from "../constancias/constancias.pdf";
import { generarPlanEjerciciosPdf } from "../planes-ejercicios/planes-ejercicios.pdf";
import { actualizarMiPerfilSchema } from "./portal-paciente.schema";
import * as portalService from "./portal-paciente.service";

const router = Router();

// Vistas del paciente sobre sus propios datos únicamente: todo endpoint
// resuelve el pacienteId a partir del usuario autenticado, nunca de un
// parámetro de la URL (ver resolverMiPacienteId).
router.use(requireAuth, roleGuard("PACIENTE"));

router.get("/perfil", async (req, res) => {
  const perfil = await portalService.obtenerMiPerfil(req.user!.sub);
  res.json(perfil);
});

router.put("/perfil", validateBody(actualizarMiPerfilSchema), async (req, res) => {
  const perfil = await portalService.actualizarMiPerfil(req.user!.sub, req.body);
  res.json(perfil);
});

router.get("/resumen-clinico", async (req, res) => {
  const resumen = await portalService.obtenerMiResumenClinico(req.user!.sub);
  res.json(resumen);
});

router.get("/citas", async (req, res) => {
  const citas = await portalService.misCitas(req.user!.sub);
  res.json(citas);
});

router.get("/documentos", async (req, res) => {
  const documentos = await portalService.misDocumentos(req.user!.sub);
  res.json(documentos);
});

router.get("/documentos/recetas/:id/pdf", async (req, res) => {
  const receta = await portalService.obtenerMiRecetaParaPdf(req.user!.sub, req.params.id);
  const membrete = await construirMembrete(receta.medicoId);
  const doc = crearDocumentoPdf("MEDIA_CARTA");
  enviarPdfComoRespuesta(doc, res, `${receta.numeroReceta}.pdf`);
  await generarRecetaPdf(doc, receta, membrete);
  doc.end();
});

router.get("/documentos/constancias/:id/pdf", async (req, res) => {
  const constancia = await portalService.obtenerMiConstanciaParaPdf(req.user!.sub, req.params.id);
  const membrete = await construirMembrete(constancia.medicoId);
  const doc = crearDocumentoPdf("MEDIA_CARTA");
  enviarPdfComoRespuesta(doc, res, `${constancia.numeroConstancia}.pdf`);
  await generarConstanciaPdf(doc, constancia, membrete);
  doc.end();
});

router.get("/documentos/planes-ejercicios/:id/pdf", async (req, res) => {
  const plan = await portalService.obtenerMiPlanParaPdf(req.user!.sub, req.params.id);
  const membrete = await construirMembrete(plan.medicoId);
  const doc = crearDocumentoPdf("MEDIA_CARTA");
  enviarPdfComoRespuesta(doc, res, `plan-ejercicios-${plan.paciente.documento}.pdf`);
  await generarPlanEjerciciosPdf(doc, plan, membrete);
  doc.end();
});

export default router;
