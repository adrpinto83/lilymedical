import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { auditLog } from "../../middleware/auditLog";
import { crearSesionSchema, actualizarSesionSchema } from "./sesiones.schema";
import * as sesionesService from "./sesiones.service";

const router = Router();

// Las notas de evolución son contenido clínico: solo MEDICO
router.use(requireAuth, roleGuard("MEDICO"));

router.post("/", auditLog("CREAR"), validateBody(crearSesionSchema), async (req, res) => {
  const sesion = await sesionesService.crearSesion(req.user!.sub, req.body);
  res.status(201).json(sesion);
});

router.put(
  "/:id",
  auditLog("EDITAR"),
  validateBody(actualizarSesionSchema),
  async (req, res) => {
    const sesion = await sesionesService.actualizarSesion(req.params.id, req.body);
    res.json(sesion);
  }
);

router.delete("/:id", auditLog("ELIMINAR"), async (req, res) => {
  await sesionesService.eliminarSesion(req.params.id);
  res.status(204).send();
});

export default router;
