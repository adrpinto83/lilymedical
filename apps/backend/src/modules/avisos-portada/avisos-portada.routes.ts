import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { activarSchema, avisoSchema } from "./avisos-portada.schema";
import * as avisosService from "./avisos-portada.service";

const router = Router();

// Pública: la portada pregunta qué aviso mostrar (o ninguno) sin sesión.
router.get("/activo", async (_req, res) => {
  res.json(await avisosService.obtenerActivo());
});

// Contenido del sitio, igual que la galería: médico y administrativo.
router.use(requireAuth, roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"));

router.get("/", async (_req, res) => {
  res.json(await avisosService.listar());
});

router.post("/", validateBody(avisoSchema), async (req, res) => {
  res.status(201).json(await avisosService.crear(req.body));
});

router.put("/:id", validateBody(avisoSchema), async (req, res) => {
  res.json(await avisosService.actualizar(req.params.id, req.body));
});

router.put("/:id/activo", validateBody(activarSchema), async (req, res) => {
  res.json(await avisosService.cambiarActivo(req.params.id, req.body.activo));
});

router.delete("/:id", async (req, res) => {
  await avisosService.eliminar(req.params.id);
  res.status(204).send();
});

export default router;
