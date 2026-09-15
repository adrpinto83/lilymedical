import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Paciente, Tarifa } from "../../types";
import { Profesional } from "../../services/usuarios";
import { crearCita } from "../../services/citas";
import { listarPacientes } from "../../services/pacientes";
import { listarTarifas } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  profesionales: Profesional[];
  fechaInicial?: Date;
  profesionalInicial?: string;
}

export function CitaFormModal({ open, onClose, onCreated, profesionales, fechaInicial, profesionalInicial }: Props) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [form, setForm] = useState({
    pacienteId: "",
    profesionalId: profesionalInicial ?? "",
    tarifaId: "",
    fecha: fechaInicial ? format(fechaInicial, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    horaInicio: fechaInicial ? format(fechaInicial, "HH:mm") : "09:00",
    duracionMinutos: 45,
    notas: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listarTarifas().then(setTarifas).catch(() => setTarifas([]));
      setForm((f) => ({
        ...f,
        profesionalId: profesionalInicial ?? f.profesionalId,
        fecha: fechaInicial ? format(fechaInicial, "yyyy-MM-dd") : f.fecha,
        horaInicio: fechaInicial ? format(fechaInicial, "HH:mm") : f.horaInicio,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fechaInicial, profesionalInicial]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (open) listarPacientes(busquedaPaciente || undefined).then(setPacientes);
    }, 250);
    return () => clearTimeout(timeout);
  }, [busquedaPaciente, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const inicio = new Date(`${form.fecha}T${form.horaInicio}:00`);
      const fin = new Date(inicio.getTime() + form.duracionMinutos * 60000);
      await crearCita({
        pacienteId: form.pacienteId,
        profesionalId: form.profesionalId,
        tarifaId: form.tarifaId || undefined,
        fechaHoraInicio: inicio.toISOString(),
        fechaHoraFin: fin.toISOString(),
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
    <Modal open={open} onClose={onClose} title="Nueva cita">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Input
            label="Buscar paciente"
            value={busquedaPaciente}
            onChange={(e) => setBusquedaPaciente(e.target.value)}
            placeholder="Nombre, documento o teléfono"
          />
          <Select
            className="mt-2"
            required
            value={form.pacienteId}
            onChange={(e) => update("pacienteId", e.target.value)}
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
          onChange={(e) => update("profesionalId", e.target.value)}
        >
          <option value="">Selecciona un profesional...</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido} {p.especialidad ? `· ${p.especialidad}` : ""}
            </option>
          ))}
        </Select>

        <Select label="Servicio / tarifa" value={form.tarifaId} onChange={(e) => update("tarifaId", e.target.value)}>
          <option value="">Sin especificar</option>
          {tarifas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombreServicio} · ${t.precio}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Fecha"
            type="date"
            required
            value={form.fecha}
            onChange={(e) => update("fecha", e.target.value)}
          />
          <Input
            label="Hora"
            type="time"
            required
            value={form.horaInicio}
            onChange={(e) => update("horaInicio", e.target.value)}
          />
          <Input
            label="Duración (min)"
            type="number"
            min={15}
            step={5}
            value={form.duracionMinutos}
            onChange={(e) => update("duracionMinutos", Number(e.target.value))}
          />
        </div>

        <Input label="Notas" value={form.notas} onChange={(e) => update("notas", e.target.value)} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Crear cita"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
