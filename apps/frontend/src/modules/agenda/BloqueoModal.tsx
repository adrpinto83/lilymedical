import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Profesional } from "../../services/usuarios";
import { crearBloqueo } from "../../services/citas";
import { getErrorMessage } from "../../services/api";

// Horario del consultorio que se bloquea con "Todo el día".
const DIA_COMPLETO = { desde: "07:00", hasta: "20:00" };

export function BloqueoModal({
  open,
  onClose,
  onCreated,
  profesionales,
  fechaInicial,
  profesionalInicial,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  profesionales: Profesional[];
  fechaInicial: Date;
  profesionalInicial?: string;
}) {
  const [form, setForm] = useState({
    profesionalId: "",
    fecha: "",
    todoElDia: false,
    desde: "12:00",
    hasta: "13:00",
    motivo: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      profesionalId: profesionalInicial ?? "",
      fecha: format(fechaInicial, "yyyy-MM-dd"),
      todoElDia: false,
      desde: "12:00",
      hasta: "13:00",
      motivo: "",
    });
  }, [open, fechaInicial, profesionalInicial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const desde = form.todoElDia ? DIA_COMPLETO.desde : form.desde;
    const hasta = form.todoElDia ? DIA_COMPLETO.hasta : form.hasta;
    if (hasta <= desde) {
      setError("La hora de fin debe ser posterior a la de inicio");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await crearBloqueo({
        profesionalId: form.profesionalId,
        fechaHoraInicio: new Date(`${form.fecha}T${desde}:00`).toISOString(),
        fechaHoraFin: new Date(`${form.fecha}T${hasta}:00`).toISOString(),
        motivo: form.motivo || undefined,
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
    <Modal open={open} onClose={onClose} title="Bloquear horario">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          En un horario bloqueado no se pueden agendar citas (almuerzo, reuniones, vacaciones...).
        </p>
        <Select
          label="Profesional"
          required
          value={form.profesionalId}
          onChange={(e) => setForm((f) => ({ ...f, profesionalId: e.target.value }))}
        >
          <option value="">Selecciona un profesional...</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido}
            </option>
          ))}
        </Select>

        <Input
          label="Fecha"
          type="date"
          required
          value={form.fecha}
          onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.todoElDia}
            onChange={(e) => setForm((f) => ({ ...f, todoElDia: e.target.checked }))}
          />
          Todo el día
        </label>

        {!form.todoElDia && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="time"
              required
              value={form.desde}
              onChange={(e) => setForm((f) => ({ ...f, desde: e.target.value }))}
            />
            <Input
              label="Hasta"
              type="time"
              required
              value={form.hasta}
              onChange={(e) => setForm((f) => ({ ...f, hasta: e.target.value }))}
            />
          </div>
        )}

        <Input
          label="Motivo"
          placeholder="Ej. Almuerzo, congreso, vacaciones"
          value={form.motivo}
          onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Bloquear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
