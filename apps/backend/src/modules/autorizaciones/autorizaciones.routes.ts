import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { crearAutorizacionSchema, actualizarAutorizacionSchema } from "./autorizaciones.schema";
import { includeConsumoAutorizacion, sesionesUsadas } from "../facturacion/facturacion.service";

const router = Router();

router.use(requireAuth, roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"));

router.get("/paciente/:pacienteId", async (req, res) => {
  const autorizaciones = await prisma.autorizacionSeguro.findMany({
    where: { pacienteId: req.params.pacienteId },
    include: { aseguradora: true, ...includeConsumoAutorizacion },
    orderBy: { fechaSolicitud: "desc" },
  });
  // Cupo consumido según las facturas emitidas contra cada autorización.
  res.json(
    autorizaciones.map(({ facturas, ...a }) => {
      const usadas = sesionesUsadas({ ...a, facturas });
      return {
        ...a,
        sesionesUsadas: usadas,
        sesionesRestantes: a.sesionesAutorizadas === null ? null : a.sesionesAutorizadas - usadas,
      };
    })
  );
});

router.post("/", validateBody(crearAutorizacionSchema), async (req, res) => {
  const autorizacion = await prisma.autorizacionSeguro.create({
    data: req.body,
    include: { aseguradora: true },
  });
  res.status(201).json(autorizacion);
});

router.put("/:id", validateBody(actualizarAutorizacionSchema), async (req, res) => {
  const autorizacion = await prisma.autorizacionSeguro.findUnique({ where: { id: req.params.id } });
  if (!autorizacion) throw new HttpError(404, "Autorización no encontrada");

  const actualizada = await prisma.autorizacionSeguro.update({
    where: { id: req.params.id },
    data: req.body,
    include: { aseguradora: true },
  });
  res.json(actualizada);
});

router.delete("/:id", async (req, res) => {
  const autorizacion = await prisma.autorizacionSeguro.findUnique({ where: { id: req.params.id } });
  if (!autorizacion) throw new HttpError(404, "Autorización no encontrada");
  await prisma.autorizacionSeguro.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
