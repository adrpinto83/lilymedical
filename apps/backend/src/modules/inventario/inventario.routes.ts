import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";

const insumoSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().optional(),
  stockMinimo: z.number().int().min(0).default(0),
  unidadMedida: z.string().optional(),
});

const movimientoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SALIDA"]),
  cantidad: z.number().int().positive(),
  motivo: z.string().optional(),
});

const router = Router();

router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO"));

router.get("/", async (_req, res) => {
  res.json(await prisma.insumo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }));
});

router.post("/", validateBody(insumoSchema), async (req, res) => {
  const insumo = await prisma.insumo.create({ data: { ...req.body, stockActual: 0 } });
  res.status(201).json(insumo);
});

router.post("/:id/movimientos", validateBody(movimientoSchema), async (req, res) => {
  const insumo = await prisma.insumo.findUnique({ where: { id: req.params.id } });
  if (!insumo) throw new HttpError(404, "Insumo no encontrado");

  const { tipo, cantidad, motivo } = req.body;
  const nuevoStock = tipo === "ENTRADA" ? insumo.stockActual + cantidad : insumo.stockActual - cantidad;
  if (nuevoStock < 0) throw new HttpError(400, "Stock insuficiente para esta salida");

  const [movimiento] = await prisma.$transaction([
    prisma.movimientoInsumo.create({
      data: {
        insumoId: insumo.id,
        tipo,
        cantidad,
        motivo,
        registradoPorId: req.user!.sub,
      },
    }),
    prisma.insumo.update({ where: { id: insumo.id }, data: { stockActual: nuevoStock } }),
  ]);

  res.status(201).json(movimiento);
});

router.get("/bajo-stock", async (_req, res) => {
  const insumos = await prisma.insumo.findMany({ where: { activo: true } });
  res.json(insumos.filter((i) => i.stockActual <= i.stockMinimo));
});

export default router;
