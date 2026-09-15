import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { validateBody } from "../../middleware/validate";
import {
  tarifaSchema,
  crearFacturaSchema,
  registrarPagoSchema,
} from "./facturacion.schema";
import * as facturacionService from "./facturacion.service";

const router = Router();

// Facturación: MEDICO y ADMINISTRATIVO (no expone datos clínicos)
router.use(requireAuth, roleGuard("MEDICO", "ADMINISTRATIVO"));

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

// Pagos
router.post(
  "/facturas/:id/pagos",
  validateBody(registrarPagoSchema),
  async (req, res) => {
    const pago = await facturacionService.registrarPago(req.params.id, req.user!.sub, req.body);
    res.status(201).json(pago);
  }
);

// Estado de cuenta
router.get("/pacientes/:pacienteId/estado-cuenta", async (req, res) => {
  res.json(await facturacionService.estadoDeCuentaPaciente(req.params.pacienteId));
});

export default router;
