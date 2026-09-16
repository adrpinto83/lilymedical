import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Factura, EstadoFactura } from "../../types";
import { listarFacturas } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { FacturaFormModal } from "./FacturaFormModal";
import { PagoModal } from "./PagoModal";
import { TarifasPanel } from "./TarifasPanel";
import { AseguradorasPanel } from "./AseguradorasPanel";
import { format } from "date-fns";

const estadoColor: Record<EstadoFactura, "amber" | "green" | "blue" | "red"> = {
  PENDIENTE: "amber",
  PARCIAL: "blue",
  PAGADA: "green",
  ANULADA: "red",
};

export function FacturacionPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [facturaPago, setFacturaPago] = useState<Factura | null>(null);

  const cargar = useCallback(async () => {
    try {
      setFacturas(await listarFacturas(undefined, estadoFiltro || undefined));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [estadoFiltro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Facturación</h1>
        <Button onClick={() => setModalOpen(true)}>+ Nueva factura</Button>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Facturas</h2>
          <Select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-48">
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="PAGADA">Pagada</option>
            <option value="ANULADA">Anulada</option>
          </Select>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {facturas.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No hay facturas registradas.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Factura</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Aseguradora</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturas.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{f.numeroFactura}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {f.paciente?.apellidos}, {f.paciente?.nombres}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{format(new Date(f.fecha), "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3 text-slate-600">${f.total}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {f.aseguradora ? (
                        <span title={`Aseguradora: $${f.montoAseguradora ?? "0"} · Paciente: $${f.montoPaciente ?? f.total}`}>
                          {f.aseguradora.nombre}
                        </span>
                      ) : (
                        "Particular"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={estadoColor[f.estado]}>{f.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.estado !== "PAGADA" && f.estado !== "ANULADA" && (
                        <Button variant="ghost" onClick={() => setFacturaPago(f)}>
                          Registrar pago
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <TarifasPanel />

      <AseguradorasPanel />

      <FacturaFormModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={cargar} />
      <PagoModal factura={facturaPago} onClose={() => setFacturaPago(null)} onRegistrado={cargar} />
    </div>
  );
}
