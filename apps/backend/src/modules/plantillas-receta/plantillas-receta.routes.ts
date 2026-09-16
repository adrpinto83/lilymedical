import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { crearPlantillaRecetaSchema } from "./plantillas-receta.schema";

const router = Router();

// Favoritos de receta: personales por médico, contenido clínico
router.use(requireAuth, roleGuard("MEDICO"));

router.get("/", async (req, res) => {
  const plantillas = await prisma.plantillaReceta.findMany({
    where: { usuarioId: req.user!.sub },
    orderBy: { createdAt: "desc" },
  });
  res.json(plantillas);
});

router.post("/", validateBody(crearPlantillaRecetaSchema), async (req, res) => {
  const plantilla = await prisma.plantillaReceta.create({
    data: { ...req.body, usuarioId: req.user!.sub },
  });
  res.status(201).json(plantilla);
});

router.delete("/:id", async (req, res) => {
  const plantilla = await prisma.plantillaReceta.findUnique({ where: { id: req.params.id } });
  if (!plantilla || plantilla.usuarioId !== req.user!.sub) {
    throw new HttpError(404, "Favorito no encontrado");
  }
  await prisma.plantillaReceta.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
