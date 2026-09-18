import { FormEvent, useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import {
  Insumo,
  MovimientoInsumo,
  actualizarInsumo,
  crearInsumo,
  desactivarInsumo,
  listarInsumos,
  listarMovimientos,
  registrarMovimiento,
} from "../../services/inventario";
import { getErrorMessage } from "../../services/api";

function InsumoFormModal({
  open,
  insumo,
  onClose,
  onSaved,
}: {
  open: boolean;
  insumo: Insumo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ nombre: "", categoria: "", unidadMedida: "", stockMinimo: "0", stockInicial: "0" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      nombre: insumo?.nombre ?? "",
      categoria: insumo?.categoria ?? "",
      unidadMedida: insumo?.unidadMedida ?? "",
      stockMinimo: String(insumo?.stockMinimo ?? 0),
      stockInicial: "0",
    });
  }, [open, insumo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const datos = {
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim() || null,
      unidadMedida: form.unidadMedida.trim() || null,
      stockMinimo: Number(form.stockMinimo) || 0,
    };
    try {
      if (insumo) await actualizarInsumo(insumo.id, datos);
      else await crearInsumo({ ...datos, stockInicial: Number(form.stockInicial) || 0 });
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={insumo ? "Editar insumo" : "Nuevo insumo"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          id="in-nombre"
          label="Nombre"
          required
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          placeholder="ej. Electrodos autoadhesivos 5x5"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="in-categoria"
            label="Categoría"
            value={form.categoria}
            onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
            placeholder="ej. Electroterapia"
          />
          <Input
            id="in-unidad"
            label="Unidad"
            value={form.unidadMedida}
            onChange={(e) => setForm((f) => ({ ...f, unidadMedida: e.target.value }))}
            placeholder="ej. paquetes"
          />
          <Input
            id="in-minimo"
            label="Stock mínimo"
            type="number"
            min={0}
            value={form.stockMinimo}
            onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))}
            hint="Alerta cuando el stock llegue a este valor"
          />
          {!insumo && (
            <Input
              id="in-inicial"
              label="Stock inicial"
              type="number"
              min={0}
              value={form.stockInicial}
              onChange={(e) => setForm((f) => ({ ...f, stockInicial: e.target.value }))}
            />
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MovimientoModal({
  insumo,
  tipo,
  onClose,
  onSaved,
}: {
  insumo: Insumo | null;
  tipo: "ENTRADA" | "SALIDA";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCantidad("1");
    setMotivo("");
    setError(null);
  }, [insumo, tipo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!insumo) return;
    setSaving(true);
    setError(null);
    try {
      await registrarMovimiento(insumo.id, { tipo, cantidad: Number(cantidad), motivo: motivo || undefined });
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!insumo}
      onClose={onClose}
      title={`${tipo === "ENTRADA" ? "Entrada" : "Salida"} · ${insumo?.nombre ?? ""}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="text-sm text-slate-600">
          Stock actual: <strong>{insumo?.stockActual}</strong> {insumo?.unidadMedida ?? ""}
        </p>
        <Input
          id="mov-cantidad"
          label="Cantidad"
          type="number"
          min={1}
          required
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <Input
          id="mov-motivo"
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={tipo === "ENTRADA" ? "ej. Compra a proveedor" : "ej. Uso en consulta"}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Registrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function HistorialModal({ insumo, onClose }: { insumo: Insumo | null; onClose: () => void }) {
  const [movimientos, setMovimientos] = useState<MovimientoInsumo[] | null>(null);

  useEffect(() => {
    setMovimientos(null);
    if (insumo) listarMovimientos(insumo.id).then(setMovimientos).catch(() => setMovimientos([]));
  }, [insumo]);

  return (
    <Modal open={!!insumo} onClose={onClose} title={`Movimientos · ${insumo?.nombre ?? ""}`}>
      {!movimientos ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : movimientos.length === 0 ? (
        <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {movimientos.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-slate-900">{m.motivo || (m.tipo === "ENTRADA" ? "Entrada" : "Salida")}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(m.fecha), "dd/MM/yyyy HH:mm")} · {m.registradoPor.nombre} {m.registradoPor.apellido}
                </p>
              </div>
              <span className={m.tipo === "ENTRADA" ? "font-medium text-lily-green-700" : "font-medium text-red-600"}>
                {m.tipo === "ENTRADA" ? "+" : "−"}
                {m.cantidad}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function InsumosPanel() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [movimiento, setMovimiento] = useState<{ insumo: Insumo; tipo: "ENTRADA" | "SALIDA" } | null>(null);
  const [historial, setHistorial] = useState<Insumo | null>(null);

  const cargar = useCallback(() => {
    listarInsumos()
      .then(setInsumos)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function handleDesactivar(insumo: Insumo) {
    if (!window.confirm(`¿Quitar "${insumo.nombre}" del inventario?`)) return;
    try {
      await desactivarInsumo(insumo.id);
      cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const bajoStock = insumos.filter((i) => i.stockActual <= i.stockMinimo).length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Insumos</h2>
          {bajoStock > 0 && <Badge color="red">{bajoStock} con stock bajo</Badge>}
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setFormOpen(true);
          }}
        >
          + Nuevo insumo
        </Button>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        {insumos.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No hay insumos registrados (electrodos, gel conductor, vendas, compresas...).
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insumos.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{i.nombre}</p>
                    <p className="text-xs text-slate-500">{i.categoria || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="mr-2 font-medium text-slate-900">
                      {i.stockActual} {i.unidadMedida ?? ""}
                    </span>
                    {i.stockActual <= i.stockMinimo && <Badge color="red">Reponer</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.stockMinimo}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="ghost" onClick={() => setMovimiento({ insumo: i, tipo: "ENTRADA" })}>
                        + Entrada
                      </Button>
                      <Button variant="ghost" onClick={() => setMovimiento({ insumo: i, tipo: "SALIDA" })}>
                        − Salida
                      </Button>
                      <Button variant="ghost" onClick={() => setHistorial(i)}>
                        Historial
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditando(i);
                          setFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => handleDesactivar(i)}>
                        Quitar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardBody>

      <InsumoFormModal open={formOpen} insumo={editando} onClose={() => setFormOpen(false)} onSaved={cargar} />
      <MovimientoModal
        insumo={movimiento?.insumo ?? null}
        tipo={movimiento?.tipo ?? "ENTRADA"}
        onClose={() => setMovimiento(null)}
        onSaved={cargar}
      />
      <HistorialModal insumo={historial} onClose={() => setHistorial(null)} />
    </Card>
  );
}
