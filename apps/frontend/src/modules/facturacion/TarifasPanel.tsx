import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Tarifa } from "../../types";
import { listarTarifas, crearTarifa, actualizarTarifa, desactivarTarifa } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { usd } from "./facturacionUtils";

export function TarifasPanel() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [form, setForm] = useState({ nombreServicio: "", precio: "" });
  const [editando, setEditando] = useState<{ id: string; nombreServicio: string; precio: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function cargar() {
    listarTarifas().then(setTarifas).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function ejecutar(fn: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await fn();
      cargar();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(() =>
      crearTarifa({ nombreServicio: form.nombreServicio.trim(), precio: Number(form.precio) })
    );
    if (ok) setForm({ nombreServicio: "", precio: "" });
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const ok = await ejecutar(() =>
      actualizarTarifa(editando.id, { nombreServicio: editando.nombreServicio.trim(), precio: Number(editando.precio) })
    );
    if (ok) setEditando(null);
  }

  function quitar(t: Tarifa) {
    if (!confirm(`¿Desactivar la tarifa "${t.nombreServicio}"? Las facturas ya emitidas no cambian.`)) return;
    ejecutar(() => desactivarTarifa(t.id));
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Tarifas por servicio</h2>
        <p className="text-xs text-slate-500">
          Cambiar un precio solo afecta a las facturas nuevas; las emitidas conservan el precio con que salieron.
        </p>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Input
            label="Servicio"
            required
            value={form.nombreServicio}
            onChange={(e) => setForm((f) => ({ ...f, nombreServicio: e.target.value }))}
            placeholder="ej. Sesión de terapia física"
          />
          <Input
            label="Precio ($)"
            type="number"
            step="0.01"
            min={0.01}
            required
            value={form.precio}
            onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
          />
          <Button type="submit" disabled={saving}>
            Agregar
          </Button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ul className="divide-y divide-slate-100">
          {tarifas.map((t) =>
            editando?.id === t.id ? (
              <li key={t.id} className="py-2">
                <form onSubmit={guardarEdicion} className="flex flex-wrap items-center gap-2">
                  <Input
                    aria-label="Servicio"
                    required
                    value={editando.nombreServicio}
                    onChange={(e) => setEditando({ ...editando, nombreServicio: e.target.value })}
                  />
                  <Input
                    aria-label="Precio"
                    type="number"
                    step="0.01"
                    min={0.01}
                    required
                    className="w-28"
                    value={editando.precio}
                    onChange={(e) => setEditando({ ...editando, precio: e.target.value })}
                  />
                  <Button type="submit" disabled={saving}>
                    Guardar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
                    Cancelar
                  </Button>
                </form>
              </li>
            ) : (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-800">{t.nombreServicio}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium tabular-nums text-slate-900">{usd(t.precio)}</span>
                  <button
                    type="button"
                    className="text-xs text-lily-blue-700 hover:underline"
                    onClick={() => setEditando({ id: t.id, nombreServicio: t.nombreServicio, precio: String(t.precio) })}
                  >
                    Editar
                  </button>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => quitar(t)}>
                    Desactivar
                  </button>
                </span>
              </li>
            )
          )}
        </ul>
      </CardBody>
    </Card>
  );
}
