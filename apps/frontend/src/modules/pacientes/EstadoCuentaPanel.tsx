import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EstadoFactura } from "../../types";
import { estadoDeCuenta, listarCitasPorFacturar } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
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

  const cargar = useCallback(() => {
    estadoDeCuenta(pacienteId)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
    listarCitasPorFacturar(pacienteId)
      .then((c) => setPorFacturar(c.length))
      .catch(() => setPorFacturar(0));
  }, [pacienteId]);

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
