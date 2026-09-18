import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";

const insumoSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().optional().nullable(),
  stockMinimo: z.number().int().min(0).default(0),
  unidadMedida: z.string().optional().nullable(),
});

const crearInsumoSchema = insumoSchema.extend({
  stockInicial: z.number().int().min(0).default(0),
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

router.get("/bajo-stock", async (_req, res) => {
  const insumos = await prisma.insumo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
  res.json(insumos.filter((i) => i.stockActual <= i.stockMinimo));
});

router.post("/", validateBody(crearInsumoSchema), async (req, res) => {
  const { stockInicial, ...datos } = req.body;
  const insumo = await prisma.$transaction(async (tx) => {
    const creado = await tx.insumo.create({ data: { ...datos, stockActual: stockInicial } });
    if (stockInicial > 0) {
      await tx.movimientoInsumo.create({
        data: {
          insumoId: creado.id,
          tipo: "ENTRADA",
          cantidad: stockInicial,
          motivo: "Stock inicial",
          registradoPorId: req.user!.sub,
        },
      });
    }
    return creado;
  });
  res.status(201).json(insumo);
});

router.put("/:id", validateBody(insumoSchema), async (req, res) => {
  res.json(await prisma.insumo.update({ where: { id: req.params.id }, data: req.body }));
});

router.delete("/:id", async (req, res) => {
  res.json(await prisma.insumo.update({ where: { id: req.params.id }, data: { activo: false } }));
});

router.get("/:id/movimientos", async (req, res) => {
  const movimientos = await prisma.movimientoInsumo.findMany({
    where: { insumoId: req.params.id },
    orderBy: { fecha: "desc" },
    take: 100,
    include: { registradoPor: { select: { nombre: true, apellido: true } } },
  });
  res.json(movimientos);
});

// El stock se descuenta de forma condicional en la misma sentencia para que
// dos salidas simultáneas no puedan dejarlo en negativo.
router.post("/:id/movimientos", validateBody(movimientoSchema), async (req, res) => {
  const { tipo, cantidad, motivo } = req.body;

  const movimiento = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.insumo.updateMany({
      where: {
        id: req.params.id,
        ...(tipo === "SALIDA" && { stockActual: { gte: cantidad } }),
      },
      data: { stockActual: tipo === "ENTRADA" ? { increment: cantidad } : { decrement: cantidad } },
    });
    if (actualizado.count === 0) {
      const existe = await tx.insumo.findUnique({ where: { id: req.params.id } });
      if (!existe) throw new HttpError(404, "Insumo no encontrado");
      throw new HttpError(400, "Stock insuficiente para esta salida");
    }
    return tx.movimientoInsumo.create({
      data: { insumoId: req.params.id, tipo, cantidad, motivo, registradoPorId: req.user!.sub },
    });
  });

  res.status(201).json(movimiento);
});

export default router;
