import { FormEvent, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { crearConstancia, abrirPdfConstancia } from "../../services/constancias";
import { getErrorMessage } from "../../services/api";

export function ConstanciaFormModal({
  open,
  onClose,
  onCreated,
  pacienteId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  pacienteId: string;
}) {
  const [diagnostico, setDiagnostico] = useState("");
  const [codigoCIE10, setCodigoCIE10] = useState("");
  const [diasReposo, setDiasReposo] = useState("");
  const [fechaInicioReposo, setFechaInicioReposo] = useState("");
  const [fechaFinReposo, setFechaFinReposo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const constancia = await crearConstancia({
        pacienteId,
        diagnostico: diagnostico || undefined,
        codigoCIE10: codigoCIE10 || undefined,
        diasReposo: diasReposo ? Number(diasReposo) : undefined,
        fechaInicioReposo: fechaInicioReposo || undefined,
        fechaFinReposo: fechaFinReposo || undefined,
        motivo,
      });
      onCreated();
      onClose();
      await abrirPdfConstancia(constancia.id);
      setDiagnostico("");
      setCodigoCIE10("");
      setDiasReposo("");
      setFechaInicioReposo("");
      setFechaFinReposo("");
      setMotivo("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva constancia médica">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Diagnóstico (opcional)" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
        <Input
          label="Código CIE-10 (opcional)"
          value={codigoCIE10}
          onChange={(e) => setCodigoCIE10(e.target.value)}
          placeholder="ej. M54.5"
        />
        <Textarea
          label="Motivo de la constancia"
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="ej. Reposo médico por lumbalgia aguda que impide actividad laboral habitual"
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Días de reposo"
            type="number"
            min={1}
            value={diasReposo}
            onChange={(e) => setDiasReposo(e.target.value)}
          />
          <Input
            label="Desde"
            type="date"
            value={fechaInicioReposo}
            onChange={(e) => setFechaInicioReposo(e.target.value)}
          />
          <Input label="Hasta" type="date" value={fechaFinReposo} onChange={(e) => setFechaFinReposo(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Generando..." : "Crear y abrir PDF"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
