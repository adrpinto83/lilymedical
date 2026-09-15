import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { HttpError } from "../../lib/http-error";
import { actualizarPerfilMedicoSchema } from "./perfil-medico.schema";
import * as perfilService from "./perfil-medico.service";

const firmasDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR || "uploads", "firmas");
if (!fs.existsSync(firmasDir)) fs.mkdirSync(firmasDir, { recursive: true });

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, firmasDir),
    filename: (req, file, cb) => cb(null, `${req.user!.sub}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Formato no permitido. Solo PNG, JPG o WEBP."));
    }
    cb(null, true);
  },
});

const router = Router();

router.use(requireAuth, roleGuard("MEDICO"));

router.get("/me", async (req, res) => {
  const perfil = await perfilService.obtenerOCrearPerfil(req.user!.sub);
  res.json(perfil);
});

router.put("/me", validateBody(actualizarPerfilMedicoSchema), async (req, res) => {
  const perfil = await perfilService.actualizarPerfil(req.user!.sub, req.body);
  res.json(perfil);
});

router.post("/me/firma", upload.single("firma"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "No se recibió ningún archivo");
  const perfil = await perfilService.actualizarFirma(req.user!.sub, req.file.filename);
  res.json(perfil);
});

export default router;
