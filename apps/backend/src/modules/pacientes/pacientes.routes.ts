import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import {
  crearPacienteSchema,
  actualizarPacienteSchema,
  pacienteAseguradoraSchema,
} from "./pacientes.schema";
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

// ---------- Aseguradoras del paciente (primaria/secundaria) ----------

router.get("/:id/aseguradoras", async (req, res) => {
  res.json(await pacientesService.listarAseguradorasDePaciente(req.params.id));
});

router.post(
  "/:id/aseguradoras",
  validateBody(pacienteAseguradoraSchema),
  async (req, res) => {
    const relacion = await pacientesService.agregarAseguradoraAPaciente(req.params.id, req.body);
    res.status(201).json(relacion);
  }
);

router.put(
  "/:id/aseguradoras/:relacionId",
  validateBody(pacienteAseguradoraSchema.partial()),
  async (req, res) => {
    const relacion = await pacientesService.actualizarAseguradoraDePaciente(
      req.params.id,
      req.params.relacionId,
      req.body
    );
    res.json(relacion);
  }
);

router.delete("/:id/aseguradoras/:relacionId", async (req, res) => {
  await pacientesService.eliminarAseguradoraDePaciente(req.params.id, req.params.relacionId);
  res.status(204).send();
});

export default router;
