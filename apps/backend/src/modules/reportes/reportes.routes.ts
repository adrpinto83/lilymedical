import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { HttpError } from "../../lib/http-error";
import { toCsv } from "../../lib/csv";
import * as reportesService from "./reportes.service";

const router = Router();

router.use(requireAuth);

router.get("/dashboard", roleGuard("MEDICO", "ADMINISTRATIVO"), async (_req, res) => {
  res.json(await reportesService.obtenerDashboard());
});

function parseRango(req: any) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) throw new HttpError(400, "Se requieren los parámetros 'desde' y 'hasta'");
  return { desde: new Date(String(desde)), hasta: new Date(String(hasta)) };
}

router.get("/ingresos", roleGuard("MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  res.json(await reportesService.reporteIngresosPorPeriodo(desde, hasta));
});

router.get("/ingresos.csv", roleGuard("MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  const { pagos } = await reportesService.reporteIngresosPorPeriodo(desde, hasta);
  const csv = toCsv(
    pagos.map((p) => ({
      fecha: p.fecha.toISOString(),
      factura: p.factura.numeroFactura,
      metodoPago: p.metodoPago,
      monto: p.monto.toString(),
      referencia: p.referencia ?? "",
    }))
  );
  res.header("Content-Type", "text/csv");
  res.attachment("ingresos.csv");
  res.send(csv);
});

router.get("/pacientes-nuevos", roleGuard("MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  res.json(await reportesService.reportePacientesPorPeriodo(desde, hasta));
});

router.get("/servicios-mas-solicitados", roleGuard("MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  res.json(await reportesService.reporteServiciosMasSolicitados(desde, hasta));
});

router.get("/cobros-aseguradora", roleGuard("MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  const aseguradoraId = typeof req.query.aseguradoraId === "string" ? req.query.aseguradoraId : undefined;
  res.json(await reportesService.reporteCobrosAseguradora(desde, hasta, aseguradoraId));
});

router.get("/cobros-aseguradora.csv", roleGuard("MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  const aseguradoraId = typeof req.query.aseguradoraId === "string" ? req.query.aseguradoraId : undefined;
  const facturas = await reportesService.reporteCobrosAseguradora(desde, hasta, aseguradoraId);
  const csv = toCsv(
    facturas.map((f) => ({
      fecha: f.fecha.toISOString(),
      factura: f.numeroFactura,
      paciente: `${f.paciente.apellidos}, ${f.paciente.nombres}`,
      documento: f.paciente.documento,
      aseguradora: f.aseguradora?.nombre ?? "",
      total: f.total.toString(),
      montoAseguradora: f.montoAseguradora?.toString() ?? "",
      montoPaciente: f.montoPaciente.toString(),
      estado: f.estado,
    }))
  );
  res.header("Content-Type", "text/csv");
  res.attachment("cobros-aseguradora.csv");
  res.send(csv);
});

export default router;
