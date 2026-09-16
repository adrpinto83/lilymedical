import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";

const plantillaEjercicioSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().optional(),
  descripcion: z.string().optional(),
  repeticionesSugeridas: z.string().optional(),
});

const router = Router();

// Catálogo de ejercicios: parte del plan de tratamiento, solo MEDICO
router.use(requireAuth, roleGuard("MEDICO"));

router.get("/", async (_req, res) => {
  const plantillas = await prisma.plantillaEjercicio.findMany({ orderBy: { nombre: "asc" } });
  res.json(plantillas);
});

router.post("/", validateBody(plantillaEjercicioSchema), async (req, res) => {
  const plantilla = await prisma.plantillaEjercicio.create({ data: req.body });
  res.status(201).json(plantilla);
});

router.delete("/:id", async (req, res) => {
  await prisma.plantillaEjercicio.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
