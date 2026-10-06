import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { auditLog } from "../../middleware/auditLog";
import { actualizarHistoriaSchema, crearEvaluacionSchema } from "./historias-clinicas.schema";
import * as historiasService from "./historias-clinicas.service";
import { crearDocumentoPdf, enviarPdfComoRespuesta, fechaConsultorio } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { obtenerMedicoTitular } from "../correos/correos.service";
import { generarHistoriaClinicaPdf, generarInformeConsultaPdf } from "./historias-clinicas.pdf";
import { HttpError } from "../../lib/http-error";

// Parsea un input tipo "YYYY-MM-DD" (date input del frontend) como día
// calendario en la hora LOCAL del servidor, en vez de UTC medianoche: si se
// usara `new Date("YYYY-MM-DD")` directamente, en zonas horarias negativas
// (ej. Venezuela, UTC-4) el día se corre uno hacia atrás al mostrarlo con
// toLocaleDateString (31/5 en vez de 1/6).
function parseFechaLocal(valor: string, finDelDia: boolean): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!match) return new Date(NaN);
  const [, anio, mes, dia] = match;
  return finDelDia
    ? new Date(Number(anio), Number(mes) - 1, Number(dia), 23, 59, 59, 999)
    : new Date(Number(anio), Number(mes) - 1, Number(dia), 0, 0, 0, 0);
}

const router = Router();

// Detalle clínico: el staff administrativo queda fuera de todo este router
// (requisitos de privacidad). El fisiatra ayudante lee la historia para dar
// seguimiento, pero editarla y evaluar sigue siendo del médico.
router.use(requireAuth, roleGuard("MEDICO", "FISIATRA_AYUDANTE"));

const soloMedico = roleGuard("MEDICO");


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
  const desde = req.query.desde ? parseFechaLocal(String(req.query.desde), false) : undefined;
  const hasta = req.query.hasta ? parseFechaLocal(String(req.query.hasta), true) : undefined;
  if (desde && isNaN(desde.getTime())) throw new HttpError(400, "Fecha 'desde' inválida");
  if (hasta && isNaN(hasta.getTime())) throw new HttpError(400, "Fecha 'hasta' inválida");
  const incluirImagenes = req.query.incluirImagenes === "true";

  const historia = await historiasService.obtenerHistoriaParaPdf(req.params.pacienteId, {
    desde,
    hasta,
    incluirImagenes,
  });
  // La historia sale con el membrete y la firma de un médico: si la imprime
  // el fisiatra ayudante, la del médico titular (no la suya).
  const medicoId = req.user!.rol === "MEDICO" ? req.user!.sub : (await obtenerMedicoTitular()).id;
  const membrete = await construirMembrete(medicoId);
  const doc = crearDocumentoPdf("CARTA", { bufferPages: true });
  enviarPdfComoRespuesta(doc, res, `historia-clinica-${historia.paciente.documento}.pdf`);
  await generarHistoriaClinicaPdf(doc, historia, membrete, { desde, hasta });
  doc.end();
});

// Informe de una sola consulta (lo registrado ese día), para entregarle al
// paciente sin darle la historia completa. ?sesionId= o ?evaluacionId=.
router.get("/paciente/:pacienteId/consulta/pdf", auditLog("VER"), async (req, res) => {
  const sesionId = typeof req.query.sesionId === "string" ? req.query.sesionId : undefined;
  const evaluacionId = typeof req.query.evaluacionId === "string" ? req.query.evaluacionId : undefined;
  if (!sesionId === !evaluacionId) throw new HttpError(400, "Indica una sesión o una evaluación");

  const consulta = await historiasService.obtenerConsultaParaPdf(
    req.params.pacienteId,
    sesionId ? { tipo: "sesion", id: sesionId } : { tipo: "evaluacion", id: evaluacionId! }
  );
  const medicoId = req.user!.rol === "MEDICO" ? req.user!.sub : (await obtenerMedicoTitular()).id;
  const membrete = await construirMembrete(medicoId);
  const doc = crearDocumentoPdf("CARTA", { bufferPages: true });
  const dia = fechaConsultorio(consulta.fecha).split("/").reverse().join("-");
  enviarPdfComoRespuesta(doc, res, `informe-consulta-${consulta.paciente.documento}-${dia}.pdf`);
  await generarInformeConsultaPdf(doc, consulta, membrete);
  doc.end();
});

router.put(
  "/paciente/:pacienteId",
  soloMedico,
  auditLog("EDITAR"),
  validateBody(actualizarHistoriaSchema),
  async (req, res) => {
    const historia = await historiasService.actualizarHistoria(req.params.pacienteId, req.body);
    res.json(historia);
  }
);

router.post(
  "/paciente/:pacienteId/evaluaciones",
  soloMedico,
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
