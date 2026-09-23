import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { HttpError } from "../../lib/http-error";
import {
  crearCitaSchema,
  crearCitasRecurrentesSchema,
  actualizarCitaSchema,
  crearBloqueoSchema,
} from "./citas.schema";
import * as citasService from "./citas.service";

const router = Router();

// Agenda: sin datos clínicos. El fisiatra ayudante la consulta para saber a
// quién atiende; agendar y cancelar sigue siendo de médico y administrativo.
router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO", "FISIATRA_AYUDANTE"));

const soloGestion = roleGuard("MEDICO", "ADMINISTRATIVO");


router.get("/", async (req, res) => {
  const { desde, hasta, profesionalId } = req.query;
  if (!desde || !hasta) {
    throw new HttpError(400, "Se requieren los parámetros 'desde' y 'hasta'");
  }
  const citas = await citasService.listarCitas(
    new Date(String(desde)),
    new Date(String(hasta)),
    profesionalId ? String(profesionalId) : undefined
  );
  res.json(citas);
});

router.post("/", soloGestion, validateBody(crearCitaSchema), async (req, res) => {
  const cita = await citasService.crearCita(req.body);
  res.status(201).json(cita);
});

router.post(
  "/recurrentes",
  soloGestion,
  validateBody(crearCitasRecurrentesSchema),
  async (req, res) => {
    const citas = await citasService.crearCitasRecurrentes(req.body);
    res.status(201).json(citas);
  }
);

router.put("/:id", soloGestion, validateBody(actualizarCitaSchema), async (req, res) => {
  const cita = await citasService.actualizarCita(req.params.id, req.body);
  res.json(cita);
});

router.post("/grupo/:grupoRecurrenciaId/cancelar", soloGestion, async (req, res) => {
  const resultado = await citasService.cancelarGrupoRecurrente(req.params.grupoRecurrenciaId);
  res.json(resultado);
});

router.get("/bloqueos", async (req, res) => {
  const { desde, hasta, profesionalId } = req.query;
  if (!desde || !hasta) {
    throw new HttpError(400, "Se requieren los parámetros 'desde' y 'hasta'");
  }
  const bloqueos = await citasService.listarBloqueos(
    new Date(String(desde)),
    new Date(String(hasta)),
    profesionalId ? String(profesionalId) : undefined
  );
  res.json(bloqueos);
});

router.post("/bloqueos", soloGestion, validateBody(crearBloqueoSchema), async (req, res) => {
  const bloqueo = await citasService.crearBloqueo(req.body);
  res.status(201).json(bloqueo);
});

router.delete("/bloqueos/:id", soloGestion, async (req, res) => {
  await citasService.eliminarBloqueo(req.params.id);
  res.status(204).send();
});

export default router;
