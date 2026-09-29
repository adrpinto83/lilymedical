import { Router } from "express";
import { Prisma } from "@prisma/client";
import { requireAuth } from "../../middleware/auth";
import { roleGuard } from "../../middleware/roleGuard";
import { HttpError } from "../../lib/http-error";
import { fechaCsv, numeroCsv, toCsv } from "../../lib/csv";
import * as reportesService from "./reportes.service";
import { repartirSaldo, resumenPeriodo } from "./reportes.resumen";

const METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  SEGURO: "Seguro",
  TRANSFERENCIA: "Transferencia",
  PAGO_MOVIL: "Pago móvil",
  ZELLE: "Zelle",
};

const ESTADO: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Pago parcial",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
};

function enviarCsv(res: any, nombre: string, csv: string) {
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.attachment(nombre);
  res.send(csv);
}

const router = Router();

router.use(requireAuth);

router.get("/dashboard", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (_req, res) => {
  res.json(await reportesService.obtenerDashboard());
});

function parseRango(req: any) {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) throw new HttpError(400, "Se requieren los parámetros 'desde' y 'hasta'");
  const rango = { desde: new Date(String(desde)), hasta: new Date(String(hasta)) };
  if (isNaN(rango.desde.getTime()) || isNaN(rango.hasta.getTime())) throw new HttpError(400, "Fechas inválidas");
  if (rango.hasta < rango.desde) throw new HttpError(400, "La fecha final es anterior a la inicial");
  return rango;
}

// Reporte consolidado del período. Los indicadores clínicos (dolor, modalidades)
// son agregados sin datos de pacientes, pero igual quedan solo para el médico.
router.get("/resumen", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  res.json(await resumenPeriodo(desde, hasta, req.user!.rol === "MEDICO"));
});

router.get("/cuentas-por-cobrar.csv", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (_req, res) => {
  const facturas = await reportesService.facturasConSaldo();
  const hoy = Date.now();
  const filas = facturas.map((f) => {
    const pagado = f.pagos.reduce((a, p) => a.add(p.monto), new Prisma.Decimal(0));
    const r = repartirSaldo({ total: f.total, montoAseguradora: f.montoAseguradora, pagado });
    return {
      Factura: f.numeroFactura,
      Fecha: fechaCsv(f.fecha),
      "Días": Math.floor((hoy - f.fecha.getTime()) / 86400000),
      Paciente: `${f.paciente.apellidos}, ${f.paciente.nombres}`,
      "Cédula": f.paciente.documento,
      "Teléfono": f.paciente.telefono,
      "Facturado a": f.aseguradora?.nombre ?? "Particular",
      "Total $": numeroCsv(f.total),
      "Pagado $": numeroCsv(pagado),
      "Saldo $": numeroCsv(r.saldo),
      "Pendiente aseguradora $": numeroCsv(r.aseguradora),
      "Pendiente paciente $": numeroCsv(r.paciente),
      Estado: ESTADO[f.estado] ?? f.estado,
    };
  });
  enviarCsv(res, "cuentas-por-cobrar.csv", toCsv(filas));
});

router.get("/ingresos", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  res.json(await reportesService.reporteIngresosPorPeriodo(desde, hasta));
});

router.get("/ingresos.csv", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  const { pagos } = await reportesService.reporteIngresosPorPeriodo(desde, hasta);
  const csv = toCsv(
    pagos.map((p) => ({
      Fecha: fechaCsv(p.fecha),
      Factura: p.factura.numeroFactura,
      Paciente: `${p.factura.paciente.apellidos}, ${p.factura.paciente.nombres}`,
      "Cédula": p.factura.paciente.documento,
      "Método": METODO[p.metodoPago] ?? p.metodoPago,
      "Monto $": numeroCsv(p.monto),
      "Monto Bs": numeroCsv(p.montoBs),
      "Tasa Bs/$": numeroCsv(p.tasaCambio, 4),
      Referencia: p.referencia ?? "",
    })),
    ["Fecha", "Factura", "Paciente", "Cédula", "Método", "Monto $", "Monto Bs", "Tasa Bs/$", "Referencia"]
  );
  enviarCsv(res, "ingresos.csv", csv);
});

router.get("/pacientes-nuevos", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  res.json(await reportesService.reportePacientesPorPeriodo(desde, hasta));
});

router.get("/servicios-mas-solicitados", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  res.json(await reportesService.reporteServiciosMasSolicitados(desde, hasta));
});

router.get("/cobros-aseguradora", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  const aseguradoraId = typeof req.query.aseguradoraId === "string" ? req.query.aseguradoraId : undefined;
  res.json(await reportesService.reporteCobrosAseguradora(desde, hasta, aseguradoraId));
});

router.get("/cobros-aseguradora.csv", roleGuard("ADMIN", "MEDICO", "ADMINISTRATIVO"), async (req, res) => {
  const { desde, hasta } = parseRango(req);
  const aseguradoraId = typeof req.query.aseguradoraId === "string" ? req.query.aseguradoraId : undefined;
  const facturas = await reportesService.reporteCobrosAseguradora(desde, hasta, aseguradoraId);
  const csv = toCsv(
    facturas.map((f) => {
      const pagado = f.pagos.reduce((a, p) => a.add(p.monto), new Prisma.Decimal(0));
      const r = repartirSaldo({ total: f.total, montoAseguradora: f.montoAseguradora, pagado });
      return {
        Fecha: fechaCsv(f.fecha),
        Factura: f.numeroFactura,
        Paciente: `${f.paciente.apellidos}, ${f.paciente.nombres}`,
        "Cédula": f.paciente.documento,
        Aseguradora: f.aseguradora?.nombre ?? "",
        "Autorización": f.autorizacion?.numeroAutorizacion ?? "",
        "Total $": numeroCsv(f.total),
        "Cubre aseguradora $": numeroCsv(f.montoAseguradora),
        "A cargo del paciente $": numeroCsv(f.montoPaciente),
        "Pendiente aseguradora $": numeroCsv(r.aseguradora),
        Estado: ESTADO[f.estado] ?? f.estado,
      };
    }),
    [
      "Fecha",
      "Factura",
      "Paciente",
      "Cédula",
      "Aseguradora",
      "Autorización",
      "Total $",
      "Cubre aseguradora $",
      "A cargo del paciente $",
      "Pendiente aseguradora $",
      "Estado",
    ]
  );
  enviarCsv(res, "cobros-aseguradora.csv", csv);
});

export default router;
