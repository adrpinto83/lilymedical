import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Factura, MetodoPago } from "../../types";
import { anularPago, obtenerFactura, registrarPago } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";

const metodos: MetodoPago[] = ["EFECTIVO", "TARJETA", "SEGURO", "TRANSFERENCIA"];

// Historial de pagos de la factura (con anulación) + registro de un pago
// nuevo mientras quede saldo. El padre lo monta con `key` = id de la factura
// para que el estado arranque limpio con cada factura.
export function PagoModal({
  factura: facturaInicial,
  onClose,
  onRegistrado,
}: {
  factura: Factura | null;
  onClose: () => void;
  onRegistrado: () => void;
}) {
  const [factura, setFactura] = useState<Factura | null>(facturaInicial);
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!factura) return null;

  const saldo = Number(factura.saldo ?? factura.total);
  const puedeCobrar = factura.estado !== "ANULADA" && saldo > 0;

  async function recargar() {
    setFactura(await obtenerFactura(factura!.id));
    onRegistrado();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await registrarPago(factura!.id, { monto: Number(monto), metodoPago, referencia: referencia || undefined });
      onRegistrado();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAnular(pagoId: string) {
    const motivo = window.prompt("Motivo de la anulación (ej. reembolso, monto mal digitado):");
    if (!motivo?.trim()) return;
    setError(null);
    try {
      await anularPago(factura!.id, pagoId, motivo.trim());
      await recargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const pagos = factura.pagos ?? [];

  return (
    <Modal open={!!factura} onClose={onClose} title={`Pagos — ${factura.numeroFactura}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          Total: <strong>${Number(factura.total).toFixed(2)}</strong> · Saldo pendiente:{" "}
          <strong>${saldo.toFixed(2)}</strong>
        </p>

        {pagos.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className={p.anulado ? "text-slate-400 line-through" : "text-slate-700"}>
                  {format(new Date(p.fecha), "dd/MM/yyyy")} · {p.metodoPago} · ${Number(p.monto).toFixed(2)}
                  {p.referencia ? ` · Ref. ${p.referencia}` : ""}
                </div>
                {p.anulado ? (
                  <span className="text-xs text-red-600" title={p.motivoAnulacion ?? undefined}>
                    Anulado
                  </span>
                ) : (
                  <Button variant="ghost" onClick={() => handleAnular(p.id)}>
                    Anular
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {puedeCobrar && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Monto"
              type="number"
              step="0.01"
              max={saldo}
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <Select
              label="Método de pago"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
            >
              {metodos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Input label="Referencia (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Registrando..." : "Registrar pago"}
              </Button>
            </div>
          </form>
        )}

        {!puedeCobrar && (
          <>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
