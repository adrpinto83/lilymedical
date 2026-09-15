import { FormEvent, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Factura, MetodoPago } from "../../types";
import { registrarPago } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";

const metodos: MetodoPago[] = ["EFECTIVO", "TARJETA", "SEGURO", "TRANSFERENCIA"];

export function PagoModal({
  factura,
  onClose,
  onRegistrado,
}: {
  factura: Factura | null;
  onClose: () => void;
  onRegistrado: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!factura) return null;

  const pagado = (factura.pagos ?? []).reduce((acc, p) => acc + Number(p.monto), 0);
  const saldo = Number(factura.total) - pagado;

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

  return (
    <Modal open={!!factura} onClose={onClose} title={`Registrar pago — ${factura.numeroFactura}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          Saldo pendiente: <strong>${saldo.toFixed(2)}</strong>
        </p>
        <Input
          label="Monto"
          type="number"
          step="0.01"
          max={saldo}
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <Select label="Método de pago" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}>
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
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registrando..." : "Registrar pago"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
