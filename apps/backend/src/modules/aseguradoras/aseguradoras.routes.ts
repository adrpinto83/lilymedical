import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";

const aseguradoraSchema = z.object({
  nombre: z.string().min(1),
  tipoConvenio: z.string().optional(),
  condiciones: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoTelefono: z.string().optional(),
});

const router = Router();

router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO"));

router.get("/", async (_req, res) => {
  const aseguradoras = await prisma.aseguradora.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
  res.json(aseguradoras);
});

router.post("/", validateBody(aseguradoraSchema), async (req, res) => {
  const aseguradora = await prisma.aseguradora.create({ data: req.body });
  res.status(201).json(aseguradora);
});

router.put("/:id", validateBody(aseguradoraSchema.partial()), async (req, res) => {
  const aseguradora = await prisma.aseguradora.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(aseguradora);
});

router.delete("/:id", async (req, res) => {
  const aseguradora = await prisma.aseguradora.findUnique({ where: { id: req.params.id } });
  if (!aseguradora) throw new HttpError(404, "Aseguradora no encontrada");
  await prisma.aseguradora.update({ where: { id: req.params.id }, data: { activo: false } });
  res.status(204).send();
});

export default router;
