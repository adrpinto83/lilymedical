import { useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  reporteIngresos,
  reportePacientesNuevos,
  reporteServiciosMasSolicitados,
  descargarIngresosCsv,
  descargarCobrosAseguradoraCsv,
} from "../../services/reportes";
import { getErrorMessage } from "../../services/api";
import { format, startOfMonth } from "date-fns";

interface ServicioResumen {
  servicio: string;
  cantidad: number;
  total: string;
}

export function ReportesPage() {
  const [desde, setDesde] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [ingresos, setIngresos] = useState<{ total: string } | null>(null);
  const [pacientesNuevos, setPacientesNuevos] = useState<{ total: number } | null>(null);
  const [servicios, setServicios] = useState<ServicioResumen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState<"ingresos" | "cobros" | null>(null);

  async function generar() {
    setLoading(true);
    setError(null);
    try {
      const d = new Date(desde);
      const h = new Date(`${hasta}T23:59:59`);
      const [ing, pac, serv] = await Promise.all([
        reporteIngresos(d, h),
        reportePacientesNuevos(d, h),
        reporteServiciosMasSolicitados(d, h),
      ]);
      setIngresos(ing as any);
      setPacientesNuevos(pac as any);
      setServicios(serv as any);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function exportarCsv(tipo: "ingresos" | "cobros") {
    setExportando(tipo);
    setError(null);
    try {
      const d = new Date(desde);
      const h = new Date(`${hasta}T23:59:59`);
      if (tipo === "ingresos") {
        await descargarIngresosCsv(d, h);
      } else {
        await descargarCobrosAseguradoraCsv(d, h);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExportando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Reportes y estadísticas</h1>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <Button onClick={generar} disabled={loading}>
            {loading ? "Generando..." : "Generar reporte"}
          </Button>
          <Button type="button" variant="secondary" disabled={exportando !== null} onClick={() => exportarCsv("ingresos")}>
            {exportando === "ingresos" ? "Exportando..." : "Exportar ingresos (CSV)"}
          </Button>
          <Button type="button" variant="secondary" disabled={exportando !== null} onClick={() => exportarCsv("cobros")}>
            {exportando === "cobros" ? "Exportando..." : "Exportar cobros a aseguradora (CSV)"}
          </Button>
        </CardBody>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(ingresos || pacientesNuevos) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">Ingresos en el período</p>
              <p className="mt-1 text-2xl font-semibold text-lily-green-600">${ingresos?.total ?? "0"}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">Pacientes nuevos en el período</p>
              <p className="mt-1 text-2xl font-semibold text-lily-blue-600">{pacientesNuevos?.total ?? 0}</p>
            </CardBody>
          </Card>
        </div>
      )}

      {servicios.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Servicios más solicitados</h2>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Total facturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {servicios.map((s) => (
                  <tr key={s.servicio}>
                    <td className="px-4 py-3 text-slate-800">{s.servicio}</td>
                    <td className="px-4 py-3 text-slate-600">{s.cantidad}</td>
                    <td className="px-4 py-3 text-slate-600">${s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
