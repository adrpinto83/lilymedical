import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Aseguradora, PacienteAseguradora } from "../../types";
import { listarAseguradoras } from "../../services/aseguradoras";
import {
  listarAseguradorasPaciente,
  agregarAseguradoraPaciente,
  actualizarAseguradoraPaciente,
  eliminarAseguradoraPaciente,
} from "../../services/pacientes";
import { getErrorMessage } from "../../services/api";

export function PacienteAseguradorasPanel({ pacienteId }: { pacienteId: string }) {
  const [relaciones, setRelaciones] = useState<PacienteAseguradora[]>([]);
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ aseguradoraId: "", numeroAfiliacion: "", esPrimaria: false });

  async function cargar() {
    try {
      const [rel, todas] = await Promise.all([
        listarAseguradorasPaciente(pacienteId),
        listarAseguradoras(),
      ]);
      setRelaciones(rel);
      setAseguradoras(todas);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  const disponibles = aseguradoras.filter((a) => !relaciones.some((r) => r.aseguradoraId === a.id));

  async function handleAgregar(e: FormEvent) {
    e.preventDefault();
    if (!form.aseguradoraId) return;
    setGuardando(true);
    setError(null);
    try {
      await agregarAseguradoraPaciente(pacienteId, {
        aseguradoraId: form.aseguradoraId,
        numeroAfiliacion: form.numeroAfiliacion || undefined,
        esPrimaria: form.esPrimaria || relaciones.length === 0,
      });
      setForm({ aseguradoraId: "", numeroAfiliacion: "", esPrimaria: false });
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  async function handleMarcarPrimaria(relacionId: string) {
    try {
      await actualizarAseguradoraPaciente(pacienteId, relacionId, { esPrimaria: true });
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleEliminar(relacionId: string) {
    if (!confirm("¿Quitar esta aseguradora del paciente?")) return;
    try {
      await eliminarAseguradoraPaciente(pacienteId, relacionId);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Aseguradoras / convenios</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {relaciones.length === 0 ? (
          <p className="text-sm text-slate-500">Paciente particular, sin aseguradora asociada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {relaciones.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {r.aseguradora?.nombre}{" "}
                    <Badge color={r.esPrimaria ? "blue" : "slate"}>{r.esPrimaria ? "Primaria" : "Secundaria"}</Badge>
                    {r.aseguradora?.requiereAutorizacion && (
                      <Badge color="amber">Requiere autorización</Badge>
                    )}
                  </p>
                  <p className="text-slate-500">
                    {r.numeroAfiliacion ? `N° afiliación: ${r.numeroAfiliacion}` : "Sin número de afiliación"}
                    {r.aseguradora?.porcentajeCobertura != null &&
                      ` · Cubre ${r.aseguradora.porcentajeCobertura}%`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!r.esPrimaria && (
                    <Button variant="ghost" onClick={() => handleMarcarPrimaria(r.id)}>
                      Marcar como primaria
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleEliminar(r.id)}
                  >
                    Quitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {disponibles.length > 0 && (
          <form onSubmit={handleAgregar} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <Select
              label="Agregar aseguradora"
              value={form.aseguradoraId}
              onChange={(e) => setForm((f) => ({ ...f, aseguradoraId: e.target.value }))}
              className="min-w-[200px]"
            >
              <option value="">Seleccionar...</option>
              {disponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
            <Input
              label="N° de afiliación"
              value={form.numeroAfiliacion}
              onChange={(e) => setForm((f) => ({ ...f, numeroAfiliacion: e.target.value }))}
            />
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.esPrimaria}
                onChange={(e) => setForm((f) => ({ ...f, esPrimaria: e.target.checked }))}
              />
              Primaria
            </label>
            <Button type="submit" disabled={guardando || !form.aseguradoraId}>
              Agregar
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
