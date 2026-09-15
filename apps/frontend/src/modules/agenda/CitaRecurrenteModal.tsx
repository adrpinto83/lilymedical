import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Paciente, Tarifa } from "../../types";
import { Profesional } from "../../services/usuarios";
import { crearCitasRecurrentes } from "../../services/citas";
import { listarPacientes } from "../../services/pacientes";
import { listarTarifas } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { format } from "date-fns";

const dias = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export function CitaRecurrenteModal({
  open,
  onClose,
  onCreated,
  profesionales,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  profesionales: Profesional[];
}) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [form, setForm] = useState({
    pacienteId: "",
    profesionalId: "",
    tarifaId: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    horaInicio: "09:00",
    duracionMinutos: 45,
    totalSesiones: 10,
    diasSemana: [] as number[],
    notas: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) listarTarifas().then(setTarifas).catch(() => setTarifas([]));
  }, [open]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (open) listarPacientes(busquedaPaciente || undefined).then(setPacientes);
    }, 250);
    return () => clearTimeout(timeout);
  }, [busquedaPaciente, open]);

  function toggleDia(dia: number) {
    setForm((f) => ({
      ...f,
      diasSemana: f.diasSemana.includes(dia)
        ? f.diasSemana.filter((d) => d !== dia)
        : [...f.diasSemana, dia],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.diasSemana.length === 0) {
      setError("Selecciona al menos un día de la semana");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const inicio = new Date(`${form.fecha}T${form.horaInicio}:00`);
      await crearCitasRecurrentes({
        pacienteId: form.pacienteId,
        profesionalId: form.profesionalId,
        tarifaId: form.tarifaId || undefined,
        fechaHoraInicio: inicio.toISOString(),
        duracionMinutos: form.duracionMinutos,
        totalSesiones: form.totalSesiones,
        diasSemana: form.diasSemana,
        notas: form.notas || undefined,
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
    <Modal open={open} onClose={onClose} title="Programar paquete de sesiones">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Input
            label="Buscar paciente"
            value={busquedaPaciente}
            onChange={(e) => setBusquedaPaciente(e.target.value)}
          />
          <Select
            className="mt-2"
            required
            value={form.pacienteId}
            onChange={(e) => setForm((f) => ({ ...f, pacienteId: e.target.value }))}
          >
            <option value="">Selecciona un paciente...</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.apellidos}, {p.nombres} · {p.documento}
              </option>
            ))}
          </Select>
        </div>

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

        <Select
          label="Servicio / tarifa"
          value={form.tarifaId}
          onChange={(e) => setForm((f) => ({ ...f, tarifaId: e.target.value }))}
        >
          <option value="">Sin especificar</option>
          {tarifas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombreServicio} · ${t.precio}
            </option>
          ))}
        </Select>

        <div>
          <span className="text-sm font-medium text-slate-700">Días de la semana</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {dias.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => toggleDia(d.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  form.diasSemana.includes(d.value)
                    ? "border-lily-blue-600 bg-lily-blue-600 text-white"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de inicio"
            type="date"
            required
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
          />
          <Input
            label="Hora"
            type="time"
            required
            value={form.horaInicio}
            onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duración (min)"
            type="number"
            min={15}
            step={5}
            value={form.duracionMinutos}
            onChange={(e) => setForm((f) => ({ ...f, duracionMinutos: Number(e.target.value) }))}
          />
          <Input
            label="Total de sesiones"
            type="number"
            min={1}
            max={100}
            value={form.totalSesiones}
            onChange={(e) => setForm((f) => ({ ...f, totalSesiones: Number(e.target.value) }))}
          />
        </div>

        <Input
          label="Notas"
          value={form.notas}
          onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Programando..." : "Programar sesiones"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
