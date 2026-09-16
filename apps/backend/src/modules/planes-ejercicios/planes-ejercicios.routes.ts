import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { auditLog } from "../../middleware/auditLog";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import { crearPlanEjerciciosSchema } from "./planes-ejercicios.schema";
import { generarPlanEjerciciosPdf } from "./planes-ejercicios.pdf";

const router = Router();

// Plan de tratamiento: contenido clínico, solo MEDICO
router.use(requireAuth, roleGuard("MEDICO"));

router.get("/paciente/:pacienteId", auditLog("VER"), async (req, res) => {
  const planes = await prisma.planEjercicios.findMany({
    where: { pacienteId: req.params.pacienteId },
    orderBy: { fecha: "desc" },
    include: { items: { orderBy: { orden: "asc" } } },
  });
  res.json(planes);
});

router.post(
  "/paciente/:pacienteId",
  auditLog("CREAR"),
  validateBody(crearPlanEjerciciosSchema),
  async (req, res) => {
    const historia = await prisma.historiaClinica.findUnique({
      where: { pacienteId: req.params.pacienteId },
    });
    if (!historia) throw new HttpError(404, "El paciente no tiene historia clínica");

    const plan = await prisma.planEjercicios.create({
      data: {
        pacienteId: req.params.pacienteId,
        historiaClinicaId: historia.id,
        medicoId: req.user!.sub,
        notas: req.body.notas,
        items: {
          create: req.body.items.map((item: { nombre: string; descripcion?: string; repeticionesSugeridas?: string }, index: number) => ({
            ...item,
            orden: index,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(plan);
  }
);

router.get("/:id/pdf", auditLog("VER"), async (req, res) => {
  const plan = await prisma.planEjercicios.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { orden: "asc" } }, paciente: true },
  });
  if (!plan) throw new HttpError(404, "Plan de ejercicios no encontrado");

  const membrete = await construirMembrete(plan.medicoId);
  const doc = crearDocumentoPdf("MEDIA_CARTA");
  enviarPdfComoRespuesta(doc, res, `plan-ejercicios-${plan.paciente.documento}.pdf`);
  await generarPlanEjerciciosPdf(doc, plan, membrete);
  doc.end();
});

export default router;
