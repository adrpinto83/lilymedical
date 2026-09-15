import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Tarifa } from "../../types";
import { listarTarifas, crearTarifa } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";

export function TarifasPanel() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [form, setForm] = useState({ nombreServicio: "", precio: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function cargar() {
    listarTarifas().then(setTarifas).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await crearTarifa({ nombreServicio: form.nombreServicio, precio: Number(form.precio) });
      setForm({ nombreServicio: "", precio: "" });
      cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Tarifas por servicio</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Input
            label="Servicio"
            required
            value={form.nombreServicio}
            onChange={(e) => setForm((f) => ({ ...f, nombreServicio: e.target.value }))}
            placeholder="ej. Terapia Física"
          />
          <Input
            label="Precio"
            type="number"
            step="0.01"
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
          {tarifas.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-800">{t.nombreServicio}</span>
              <span className="font-medium text-slate-900">${t.precio}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
