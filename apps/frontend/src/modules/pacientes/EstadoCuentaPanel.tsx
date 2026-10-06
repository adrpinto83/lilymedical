import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EstadoFactura, Presupuesto } from "../../types";
import { estadoDeCuenta, listarCitasPorFacturar } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { abrirPdfPresupuesto, listarPresupuestos } from "../../services/presupuestos";
import { PresupuestoFormModal } from "../facturacion/PresupuestoFormModal";
import { FacturaFormModal } from "../facturacion/FacturaFormModal";
import { FacturaDetalleModal } from "../facturacion/FacturaDetalleModal";
import { ESTADO_FACTURA, usd } from "../facturacion/facturacionUtils";

interface FacturaResumen {
  facturaId: string;
  numeroFactura: string;
  fecha: string;
  total: string;
  pagado: string;
  saldo: string;
  estado: EstadoFactura;
}

export function EstadoCuentaPanel({ pacienteId }: { pacienteId: string }) {
  const [data, setData] = useState<{ facturas: FacturaResumen[]; saldoTotal: string } | null>(null);
  const [porFacturar, setPorFacturar] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [facturaAbierta, setFacturaAbierta] = useState<string | null>(null);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoOpen, setPresupuestoOpen] = useState(false);

  const cargar = useCallback(() => {
    estadoDeCuenta(pacienteId)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
    listarCitasPorFacturar(pacienteId)
      .then((c) => setPorFacturar(c.length))
      .catch(() => setPorFacturar(0));
    listarPresupuestos({ pacienteId })
      .then(setPresupuestos)
      .catch(() => setPresupuestos([]));
  }, [pacienteId]);

  async function verPresupuesto(id: string) {
    try {
      await abrirPdfPresupuesto(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Cargando estado de cuenta...</p>;

  const saldo = Number(data.saldoTotal);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Saldo pendiente</p>
          <p className={`text-xl font-semibold tabular-nums ${saldo > 0 ? "text-amber-700" : "text-slate-900"}`}>
            {usd(saldo)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Sesiones atendidas sin facturar</p>
          <p className="text-xl font-semibold text-slate-900">{porFacturar}</p>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 p-4">
          <Button onClick={() => setNuevaOpen(true)}>
            + {porFacturar > 0 ? `Facturar ${porFacturar} sesión(es)` : "Nueva factura"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Facturas del paciente</h2>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {data.facturas.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Este paciente no tiene facturas registradas.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Factura</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pagado</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.facturas.map((f) => {
                  const cobrable = Number(f.saldo) > 0;
                  return (
                    <tr
                      key={f.facturaId}
                      className="cursor-pointer hover:bg-lily-blue-50"
                      onClick={() => setFacturaAbierta(f.facturaId)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{f.numeroFactura}</td>
                      <td className="px-4 py-3 text-slate-600">{format(new Date(f.fecha), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{usd(f.total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{usd(f.pagado)}</td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${cobrable ? "font-medium text-amber-700" : "text-slate-400"}`}
                      >
                        {usd(f.saldo)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={ESTADO_FACTURA[f.estado]?.color ?? "slate"}>
                          {ESTADO_FACTURA[f.estado]?.label ?? f.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant={cobrable ? "secondary" : "ghost"}>{cobrable ? "Cobrar" : "Ver"}</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Presupuestos</h2>
          <Button variant="secondary" onClick={() => setPresupuestoOpen(true)}>
            + Nuevo presupuesto
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {presupuestos.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Este paciente no tiene presupuestos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {presupuestos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className={p.anulado ? "text-slate-400" : undefined}>
                    <p className="font-medium">
                      {p.numeroPresupuesto} {p.anulado && <Badge color="red">Anulado</Badge>}
                      <span className="font-normal text-slate-500"> · {format(new Date(p.fecha), "dd/MM/yyyy")}</span>
                    </p>
                    <p className="text-slate-500">
                      {p.items.map((i) => `${i.cantidad} × ${i.descripcion}`).join(", ")} · {usd(p.total)}
                    </p>
                  </div>
                  <Button variant="ghost" className="shrink-0" onClick={() => verPresupuesto(p.id)}>
                    Ver PDF
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <PresupuestoFormModal
        open={presupuestoOpen}
        pacienteIdFijo={pacienteId}
        onClose={() => setPresupuestoOpen(false)}
        onCreated={(p) => {
          cargar();
          verPresupuesto(p.id);
        }}
      />
      <FacturaFormModal
        open={nuevaOpen}
        pacienteIdFijo={pacienteId}
        onClose={() => setNuevaOpen(false)}
        onCreated={(f) => {
          cargar();
          setFacturaAbierta(f.id);
        }}
      />
      <FacturaDetalleModal facturaId={facturaAbierta} onClose={() => setFacturaAbierta(null)} onCambio={cargar} />
    </div>
  );
}
