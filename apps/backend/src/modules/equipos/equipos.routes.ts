import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { equipoSchema, mantenimientoSchema } from "./equipos.schema";
import * as equiposService from "./equipos.service";

const router = Router();

router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO"));

router.get("/", async (req, res) => {
  res.json(await equiposService.listarEquipos(req.query.incluirBajas === "true"));
});

router.get("/alertas", async (_req, res) => {
  res.json(await equiposService.obtenerAlertas());
});

router.get("/:id", async (req, res) => {
  res.json(await equiposService.obtenerEquipo(req.params.id));
});

router.post("/", validateBody(equipoSchema), async (req, res) => {
  res.status(201).json(await equiposService.crearEquipo(req.body));
});

router.put("/:id", validateBody(equipoSchema), async (req, res) => {
  res.json(await equiposService.actualizarEquipo(req.params.id, req.body));
});

router.delete("/:id", async (req, res) => {
  res.json(await equiposService.darDeBaja(req.params.id));
});

router.post("/:id/mantenimientos", validateBody(mantenimientoSchema), async (req, res) => {
  const mantenimiento = await equiposService.registrarMantenimiento(
    req.params.id,
    req.body,
    req.user!.sub
  );
  res.status(201).json(mantenimiento);
});

export default router;
