import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { prisma } from "../../lib/prisma";

const router = Router();

router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO"));

// Lista de profesionales (para asignar citas/sesiones en la agenda)
router.get("/profesionales", async (_req, res) => {
  const profesionales = await prisma.usuario.findMany({
    where: { rol: "MEDICO", activo: true },
    select: { id: true, nombre: true, apellido: true, especialidad: true },
    orderBy: { nombre: "asc" },
  });
  res.json(profesionales);
});

export default router;
