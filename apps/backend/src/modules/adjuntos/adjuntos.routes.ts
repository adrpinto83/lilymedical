import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { auditLog } from "../../middleware/auditLog";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { uploadsDir, rutaAbsolutaAdjunto } from "../../lib/uploads";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido. Solo PDF, PNG, JPG o WEBP."));
    }
    cb(null, true);
  },
});

const router = Router();

// Contenido clínico: solo MEDICO puede subir/ver estudios de un paciente
router.use(requireAuth, roleGuard("MEDICO"));

router.post(
  "/paciente/:pacienteId",
  auditLog("CREAR"),
  upload.single("archivo"),
  async (req, res) => {
    if (!req.file) throw new HttpError(400, "No se recibió ningún archivo");

    const historia = await prisma.historiaClinica.findUnique({
      where: { pacienteId: req.params.pacienteId },
    });
    if (!historia) throw new HttpError(404, "Historia clínica no encontrada");

    const tipo = req.file.mimetype === "application/pdf" ? "PDF" : "IMAGEN";

    const adjunto = await prisma.adjunto.create({
      data: {
        historiaClinicaId: historia.id,
        tipo,
        categoria: req.body.categoria || undefined,
        nombreArchivo: req.file.originalname,
        rutaArchivo: req.file.filename,
        descripcion: req.body.descripcion,
        subidoPorId: req.user!.sub,
      },
    });

    res.status(201).json(adjunto);
  }
);

router.get("/:id/descargar", auditLog("VER"), async (req, res) => {
  const adjunto = await prisma.adjunto.findUnique({ where: { id: req.params.id } });
  if (!adjunto) throw new HttpError(404, "Adjunto no encontrado");
  res.download(rutaAbsolutaAdjunto(adjunto.rutaArchivo), adjunto.nombreArchivo);
});

router.delete("/:id", auditLog("ELIMINAR"), async (req, res) => {
  const adjunto = await prisma.adjunto.findUnique({ where: { id: req.params.id } });
  if (!adjunto) throw new HttpError(404, "Adjunto no encontrado");

  const filePath = rutaAbsolutaAdjunto(adjunto.rutaArchivo);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await prisma.adjunto.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
