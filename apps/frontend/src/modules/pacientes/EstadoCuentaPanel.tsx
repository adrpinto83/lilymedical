import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { estadoDeCuenta } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";

interface FacturaResumen {
  facturaId: string;
  numeroFactura: string;
  fecha: string;
  total: string;
  pagado: string;
  saldo: string;
  estado: string;
}

const estadoColor: Record<string, "amber" | "green" | "blue" | "red"> = {
  PENDIENTE: "amber",
  PARCIAL: "blue",
  PAGADA: "green",
  ANULADA: "red",
};

export function EstadoCuentaPanel({ pacienteId }: { pacienteId: string }) {
  const [data, setData] = useState<{ facturas: FacturaResumen[]; saldoTotal: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    estadoDeCuenta(pacienteId)
      .then(setData as any)
      .catch((err) => setError(getErrorMessage(err)));
  }, [pacienteId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Cargando estado de cuenta...</p>;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Estado de cuenta</h2>
        <span className="text-sm text-slate-600">
          Saldo pendiente: <strong className="text-slate-900">${data.saldoTotal}</strong>
        </span>
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
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Pagado</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.facturas.map((f) => (
                <tr key={f.facturaId}>
                  <td className="px-4 py-3 font-medium text-slate-900">{f.numeroFactura}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(f.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-600">${f.total}</td>
                  <td className="px-4 py-3 text-slate-600">${f.pagado}</td>
                  <td className="px-4 py-3 text-slate-600">${f.saldo}</td>
                  <td className="px-4 py-3">
                    <Badge color={estadoColor[f.estado] ?? "slate"}>{f.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}
