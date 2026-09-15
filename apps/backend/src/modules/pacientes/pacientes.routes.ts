import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { crearPacienteSchema, actualizarPacienteSchema } from "./pacientes.schema";
import * as pacientesService from "./pacientes.service";

const router = Router();

// Pacientes: accesible por MEDICO y ADMINISTRATIVO (datos no clínicos).
// El detalle clínico vive en /historias-clinicas, protegido aparte.
router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO"));

router.get("/", async (req, res) => {
  const busqueda = typeof req.query.q === "string" ? req.query.q : undefined;
  const pacientes = await pacientesService.listarPacientes(busqueda);
  res.json(pacientes);
});

router.get("/:id", async (req, res) => {
  const paciente = await pacientesService.obtenerPaciente(req.params.id);
  res.json(paciente);
});

router.post("/", validateBody(crearPacienteSchema), async (req, res) => {
  const paciente = await pacientesService.crearPaciente(req.body);
  res.status(201).json(paciente);
});

router.put("/:id", validateBody(actualizarPacienteSchema), async (req, res) => {
  const paciente = await pacientesService.actualizarPaciente(req.params.id, req.body);
  res.json(paciente);
});

router.delete("/:id", async (req, res) => {
  await pacientesService.desactivarPaciente(req.params.id);
  res.status(204).send();
});

export default router;
