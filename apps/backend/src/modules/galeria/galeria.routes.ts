import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { HttpError } from "../../lib/http-error";
import { actualizarFotoSchema, reordenarSchema } from "./galeria.schema";
import * as galeriaService from "./galeria.service";

if (!fs.existsSync(galeriaService.galeriaDir)) {
  fs.mkdirSync(galeriaService.galeriaDir, { recursive: true });
}

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, galeriaService.galeriaDir),
    filename: (_req, file, cb) => {
      const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unico}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new HttpError(400, "Formato no permitido. Solo PNG, JPG, WEBP o AVIF."));
    }
    cb(null, true);
  },
});

const router = Router();

// Pública: la landing la consume sin sesión iniciada.
router.get("/", async (_req, res) => {
  res.json(await galeriaService.listarPublicas());
});

// El resto es gestión del contenido del sitio, no dato clínico: lo maneja
// tanto la médico como el personal administrativo.
router.use(requireAuth, roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"));

router.get("/gestion", async (_req, res) => {
  res.json(await galeriaService.listarTodas());
});

router.post("/", upload.single("foto"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "No se recibió ninguna imagen");
  const foto = await galeriaService.crearFoto({
    archivo: req.file.filename,
    nombreOriginal: req.file.originalname,
    pie: typeof req.body.pie === "string" ? req.body.pie : undefined,
    subidoPorId: req.user!.sub,
  });
  res.status(201).json(foto);
});

// Antes de "/:id", o Express tomaría "orden" como un id.
router.put("/orden", validateBody(reordenarSchema), async (req, res) => {
  res.json(await galeriaService.reordenar(req.body.ids));
});

router.put("/:id", validateBody(actualizarFotoSchema), async (req, res) => {
  res.json(await galeriaService.actualizarFoto(req.params.id, req.body));
});

router.delete("/:id", async (req, res) => {
  await galeriaService.eliminarFoto(req.params.id);
  res.status(204).send();
});

export default router;
