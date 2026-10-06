import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Presupuesto } from "../../types";
import { abrirPdfPresupuesto, anularPresupuesto, listarPresupuestos } from "../../services/presupuestos";
import { getErrorMessage } from "../../services/api";
import { PresupuestoFormModal } from "./PresupuestoFormModal";
import { bs, redondear2, usd } from "./facturacionUtils";

// Igual que en el PDF: Bs por línea a la tasa del día y se suman.
function totalBs(p: Presupuesto) {
  if (!p.tasaCambio) return null;
  const tasa = Number(p.tasaCambio);
  return redondear2(p.items.reduce((a, i) => a + redondear2(Number(i.subtotal) * tasa), 0));
}

export function PresupuestosPanel({ nuevoAbierto, onCerrarNuevo }: { nuevoAbierto: boolean; onCerrarNuevo: () => void }) {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recienCreado, setRecienCreado] = useState<Presupuesto | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPresupuestos(await listarPresupuestos({ q: q || undefined }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [q]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function verPdf(id: string) {
    setError(null);
    try {
      await abrirPdfPresupuesto(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function anular(p: Presupuesto) {
    if (!confirm(`¿Anular el presupuesto ${p.numeroPresupuesto}?`)) return;
    try {
      await anularPresupuesto(p.id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <>
      {recienCreado && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-lily-green-200 bg-lily-green-50 px-4 py-3 text-sm text-lily-green-800">
          <span>Se creó el presupuesto {recienCreado.numeroPresupuesto}.</span>
          <Button variant="secondary" onClick={() => verPdf(recienCreado.id)}>
            Ver / imprimir PDF
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-3">
          <Input
            aria-label="Buscar presupuesto"
            placeholder="Buscar por N°, paciente o cédula"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-72"
          />
          {cargando && <span className="text-xs text-slate-400">Cargando...</span>}
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!cargando && presupuestos.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no hay presupuestos.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">N°</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Paciente</th>
                  <th className="px-4 py-2">Servicios</th>
                  <th className="px-4 py-2 text-right">Total $</th>
                  <th className="px-4 py-2 text-right">Total Bs</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {presupuestos.map((p) => {
                  const enBs = totalBs(p);
                  return (
                    <tr key={p.id} className={clsx(p.anulado && "text-slate-400")}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {p.numeroPresupuesto} {p.anulado && <Badge color="red">Anulado</Badge>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{format(new Date(p.fecha), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3">
                        {p.paciente ? `${p.paciente.apellidos}, ${p.paciente.nombres}` : "—"}
                        {p.paciente && <span className="block text-xs text-slate-400">{p.paciente.documento}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.items.map((i) => `${i.cantidad} × ${i.descripcion}`).join(", ")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{usd(p.total)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{enBs !== null ? bs(enBs) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Button variant="ghost" onClick={() => verPdf(p.id)}>
                          Ver PDF
                        </Button>
                        {!p.anulado && (
                          <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => anular(p)}>
                            Anular
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <PresupuestoFormModal
        open={nuevoAbierto}
        onClose={onCerrarNuevo}
        onCreated={(p) => {
          setRecienCreado(p);
          cargar();
        }}
      />
    </>
  );
}
