import { Router } from "express";
import { validateBody } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { loginSchema, registerSchema, registroPacienteSchema } from "./auth.schema";
import * as authService from "./auth.service";

const router = Router();

router.post("/login", validateBody(loginSchema), async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

// Alta pública del portal del paciente (ver auth.service.registrarPaciente
// para las validaciones de cédula/email contra la ficha ya existente).
router.post(
  "/registro-paciente",
  validateBody(registroPacienteSchema),
  async (req, res) => {
    const result = await authService.registrarPaciente(req.body);
    res.status(201).json(result);
  }
);

// Solo un médico (dueño del consultorio) puede dar de alta nuevos usuarios/staff
router.post(
  "/register",
  requireAuth,
  roleGuard("MEDICO"),
  validateBody(registerSchema),
  async (req, res) => {
    const usuario = await authService.register(req.body);
    res.status(201).json(usuario);
  }
);

// Devuelve el usuario tal como está HOY en la base de datos (no lo que
// quedó grabado en el JWT al iniciar sesión), para poder refrescar el
// nombre/rol en el cliente sin forzar un re-login.
router.get("/me", requireAuth, async (req, res) => {
  const usuario = await authService.obtenerPerfilActual(req.user!.sub);
  res.json({ usuario });
});

export default router;
