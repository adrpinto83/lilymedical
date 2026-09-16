import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Aseguradora } from "../../types";
import { listarAseguradoras, crearAseguradora, actualizarAseguradora } from "../../services/aseguradoras";
import { getErrorMessage } from "../../services/api";

const emptyForm = { nombre: "", porcentajeCobertura: "", requiereAutorizacion: false };

export function AseguradorasPanel() {
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function cargar() {
    listarAseguradoras().then(setAseguradoras).catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    cargar();
  }, []);

  function editar(a: Aseguradora) {
    setEditandoId(a.id);
    setForm({
      nombre: a.nombre,
      porcentajeCobertura: a.porcentajeCobertura != null ? String(a.porcentajeCobertura) : "",
      requiereAutorizacion: a.requiereAutorizacion,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nombre: form.nombre,
        porcentajeCobertura: form.porcentajeCobertura ? Number(form.porcentajeCobertura) : undefined,
        requiereAutorizacion: form.requiereAutorizacion,
      };
      if (editandoId) {
        await actualizarAseguradora(editandoId, payload);
      } else {
        await crearAseguradora(payload);
      }
      setForm(emptyForm);
      setEditandoId(null);
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
        <h2 className="text-sm font-semibold text-slate-900">Aseguradoras y convenios</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Input
            label="Nombre"
            required
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="ej. PDVSA - HCM"
          />
          <Input
            label="% de cobertura"
            type="number"
            min={0}
            max={100}
            value={form.porcentajeCobertura}
            onChange={(e) => setForm((f) => ({ ...f, porcentajeCobertura: e.target.value }))}
            hint="Vacío = se cobra 100% a la aseguradora"
          />
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.requiereAutorizacion}
              onChange={(e) => setForm((f) => ({ ...f, requiereAutorizacion: e.target.checked }))}
            />
            Requiere autorización previa
          </label>
          <Button type="submit" disabled={saving}>
            {editandoId ? "Guardar cambios" : "Agregar"}
          </Button>
          {editandoId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditandoId(null);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
          )}
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ul className="divide-y divide-slate-100">
          {aseguradoras.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-800">
                {a.nombre}{" "}
                {a.porcentajeCobertura != null && <Badge color="blue">{a.porcentajeCobertura}% cobertura</Badge>}{" "}
                {a.requiereAutorizacion && <Badge color="amber">Requiere autorización</Badge>}
              </span>
              <Button variant="ghost" onClick={() => editar(a)}>
                Editar
              </Button>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
