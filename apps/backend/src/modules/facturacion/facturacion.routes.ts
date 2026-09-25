import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { crearDocumentoPdf, enviarPdfComoRespuesta } from "../../lib/pdf";
import { construirMembrete } from "../perfil-medico/perfil-medico.service";
import {
  tarifaSchema,
  crearFacturaSchema,
  registrarPagoSchema,
  anularPagoSchema,
} from "./facturacion.schema";
import * as facturacionService from "./facturacion.service";
import { generarFacturaPdf } from "./facturacion.pdf";

const router = Router();

// Facturación: MEDICO y ADMINISTRATIVO (no expone datos clínicos)
router.use(requireAuth, roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"));

// Tarifas
router.get("/tarifas", async (_req, res) => {
  res.json(await facturacionService.listarTarifas());
});
router.post("/tarifas", validateBody(tarifaSchema), async (req, res) => {
  res.status(201).json(await facturacionService.crearTarifa(req.body));
});
router.put("/tarifas/:id", validateBody(tarifaSchema.partial()), async (req, res) => {
  res.json(await facturacionService.actualizarTarifa(req.params.id, req.body));
});
router.delete("/tarifas/:id", async (req, res) => {
  await facturacionService.desactivarTarifa(req.params.id);
  res.status(204).send();
});

// Facturas
router.get("/facturas", async (req, res) => {
  const { pacienteId, estado } = req.query;
  res.json(
    await facturacionService.listarFacturas(
      pacienteId ? String(pacienteId) : undefined,
      estado ? String(estado) : undefined
    )
  );
});
router.get("/facturas/:id", async (req, res) => {
  res.json(await facturacionService.obtenerFactura(req.params.id));
});
router.post("/facturas", validateBody(crearFacturaSchema), async (req, res) => {
  res.status(201).json(await facturacionService.crearFactura(req.body));
});
router.post("/facturas/:id/anular", async (req, res) => {
  res.json(await facturacionService.anularFactura(req.params.id));
});

// La factura sale con el membrete del consultorio (el médico titular), sin
// importar si la imprime el médico o el personal administrativo.
router.get("/facturas/:id/pdf", async (req, res) => {
  const factura = await facturacionService.obtenerFactura(req.params.id);
  const titular = await prisma.usuario.findFirst({
    where: { rol: "MEDICO", activo: true },
    orderBy: { createdAt: "asc" },
  });
  if (!titular) throw new HttpError(500, "No hay un médico titular configurado para el membrete");
  const membrete = await construirMembrete(titular.id);
  const doc = crearDocumentoPdf();
  enviarPdfComoRespuesta(doc, res, `${factura.numeroFactura}.pdf`);
  generarFacturaPdf(doc, factura, membrete);
  doc.end();
});

// Pagos
router.post(
  "/facturas/:id/pagos",
  validateBody(registrarPagoSchema),
  async (req, res) => {
    const pago = await facturacionService.registrarPago(req.params.id, req.user!.sub, req.body);
    res.status(201).json(pago);
  }
);

// Un pago no se borra: se anula con motivo y queda registrado quién lo hizo.
router.post(
  "/facturas/:id/pagos/:pagoId/anular",
  validateBody(anularPagoSchema),
  async (req, res) => {
    res.json(
      await facturacionService.anularPago(req.params.id, req.params.pagoId, req.user!.sub, req.body)
    );
  }
);

// Estado de cuenta
router.get("/pacientes/:pacienteId/estado-cuenta", async (req, res) => {
  res.json(await facturacionService.estadoDeCuentaPaciente(req.params.pacienteId));
});

export default router;
