import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import * as authService from "../auth/auth.service";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  reiniciarPasswordSchema,
} from "./usuarios.schema";

const router = Router();

const CAMPOS_PUBLICOS = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  rol: true,
  especialidad: true,
  activo: true,
  createdAt: true,
} as const;

router.use(requireAuth);

// Quién puede atender: médicos y fisiatras ayudantes. Lo consulta todo el
// personal para asignar citas y sesiones en la agenda.
router.get(
  "/profesionales",
  roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO", "FISIATRA_AYUDANTE"),
  async (_req, res) => {
    const profesionales = await prisma.usuario.findMany({
      where: { rol: { in: ["MEDICO", "FISIATRA_AYUDANTE"] }, activo: true },
      select: { id: true, nombre: true, apellido: true, especialidad: true, rol: true },
      orderBy: { nombre: "asc" },
    });
    res.json(profesionales);
  }
);

// La gestión del personal la llevan el médico dueño del consultorio y el
// administrador del sistema.
router.use(roleGuard("ADMIN", "MEDICO"));

router.get("/", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    where: { rol: { not: "PACIENTE" } },
    select: CAMPOS_PUBLICOS,
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  res.json(usuarios);
});

router.post("/", validateBody(crearUsuarioSchema), async (req, res) => {
  const usuario = await authService.register(req.body);
  res.status(201).json(usuario);
});

router.put("/:id", validateBody(actualizarUsuarioSchema), async (req, res) => {
  // Desactivarse a uno mismo dejaría el consultorio sin quien administre.
  if (req.params.id === req.user!.sub && req.body.activo === false) {
    throw new HttpError(400, "No puedes desactivar tu propia cuenta");
  }
  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data: req.body,
    select: CAMPOS_PUBLICOS,
  });
  res.json(usuario);
});

// Reinicio de contraseña de otra persona (la olvidó). Para la propia se usa
// PUT /api/auth/password, que sí exige la contraseña actual.
router.post("/:id/password", validateBody(reiniciarPasswordSchema), async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
  if (!usuario) throw new HttpError(404, "Usuario no encontrado");

  await prisma.usuario.update({
    where: { id: req.params.id },
    data: {
      passwordHash: await bcrypt.hash(req.body.nueva, 10),
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });
  res.status(204).send();
});

export default router;
