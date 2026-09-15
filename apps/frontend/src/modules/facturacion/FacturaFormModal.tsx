import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Paciente, Tarifa } from "../../types";
import { listarPacientes } from "../../services/pacientes";
import { listarTarifas, crearFactura } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";

interface DetalleForm {
  tarifaId: string;
  cantidad: number;
}

export function FacturaFormModal({
  open,
  onClose,
  onCreated,
  pacienteIdFijo,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  pacienteIdFijo?: string;
}) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pacienteId, setPacienteId] = useState(pacienteIdFijo ?? "");
  const [detalles, setDetalles] = useState<DetalleForm[]>([{ tarifaId: "", cantidad: 1 }]);
  const [impuestos, setImpuestos] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) listarTarifas().then(setTarifas).catch(() => setTarifas([]));
  }, [open]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (open && !pacienteIdFijo) listarPacientes(busqueda || undefined).then(setPacientes);
    }, 250);
    return () => clearTimeout(timeout);
  }, [busqueda, open, pacienteIdFijo]);

  function actualizarDetalle(index: number, cambios: Partial<DetalleForm>) {
    setDetalles((d) => d.map((det, i) => (i === index ? { ...det, ...cambios } : det)));
  }

  function tarifaPorId(id: string) {
    return tarifas.find((t) => t.id === id);
  }

  const subtotal = detalles.reduce((acc, d) => {
    const tarifa = tarifaPorId(d.tarifaId);
    return acc + (tarifa ? Number(tarifa.precio) * d.cantidad : 0);
  }, 0);
  const total = subtotal + Number(impuestos || 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await crearFactura({
        pacienteId,
        impuestos: Number(impuestos || 0),
        detalles: detalles
          .filter((d) => d.tarifaId)
          .map((d) => ({ tarifaId: d.tarifaId, cantidad: d.cantidad })),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva factura" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!pacienteIdFijo && (
          <div>
            <Input label="Buscar paciente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <Select className="mt-2" required value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Selecciona un paciente...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos}, {p.nombres} · {p.documento}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Servicios</span>
          {detalles.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                className="flex-1"
                value={d.tarifaId}
                onChange={(e) => actualizarDetalle(i, { tarifaId: e.target.value })}
              >
                <option value="">Selecciona un servicio...</option>
                {tarifas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombreServicio} · ${t.precio}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                className="w-20"
                value={d.cantidad}
                onChange={(e) => actualizarDetalle(i, { cantidad: Number(e.target.value) })}
              />
              <button
                type="button"
                className="text-slate-400 hover:text-red-500"
                onClick={() => setDetalles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            onClick={() => setDetalles((prev) => [...prev, { tarifaId: "", cantidad: 1 }])}
          >
            + Agregar servicio
          </Button>
        </div>

        <Input
          label="Impuestos"
          type="number"
          step="0.01"
          value={impuestos}
          onChange={(e) => setImpuestos(e.target.value)}
          className="max-w-xs"
        />

        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !pacienteId}>
            {saving ? "Guardando..." : "Crear factura"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
