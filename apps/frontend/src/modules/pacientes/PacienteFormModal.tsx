import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Paciente } from "../../types";
import { crearPaciente, actualizarPaciente } from "../../services/pacientes";
import { getErrorMessage } from "../../services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (paciente: Paciente) => void;
  paciente?: Paciente | null;
}

const emptyForm = {
  nombres: "",
  apellidos: "",
  documento: "",
  fechaNacimiento: "",
  sexo: "FEMENINO" as const,
  telefono: "",
  email: "",
  direccion: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTelefono: "",
};

export function PacienteFormModal({ open, onClose, onSaved, paciente }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paciente) {
      setForm({
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        documento: paciente.documento,
        fechaNacimiento: paciente.fechaNacimiento.slice(0, 10),
        sexo: paciente.sexo as any,
        telefono: paciente.telefono,
        email: paciente.email ?? "",
        direccion: paciente.direccion ?? "",
        contactoEmergenciaNombre: paciente.contactoEmergenciaNombre ?? "",
        contactoEmergenciaTelefono: paciente.contactoEmergenciaTelefono ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [paciente, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        email: form.email || undefined,
      };
      const saved = paciente
        ? await actualizarPaciente(paciente.id, payload)
        : await crearPaciente(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={paciente ? "Editar paciente" : "Nuevo paciente"} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nombres" required value={form.nombres} onChange={(e) => update("nombres", e.target.value)} />
        <Input label="Apellidos" required value={form.apellidos} onChange={(e) => update("apellidos", e.target.value)} />
        <Input label="Documento / Cédula" required value={form.documento} onChange={(e) => update("documento", e.target.value)} />
        <Input
          label="Fecha de nacimiento"
          type="date"
          required
          value={form.fechaNacimiento}
          onChange={(e) => update("fechaNacimiento", e.target.value)}
        />
        <Select label="Sexo" value={form.sexo} onChange={(e) => update("sexo", e.target.value as any)}>
          <option value="FEMENINO">Femenino</option>
          <option value="MASCULINO">Masculino</option>
          <option value="OTRO">Otro</option>
        </Select>
        <Input label="Teléfono" required value={form.telefono} onChange={(e) => update("telefono", e.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        <Input label="Dirección" value={form.direccion} onChange={(e) => update("direccion", e.target.value)} />
        <Input
          label="Contacto de emergencia"
          value={form.contactoEmergenciaNombre}
          onChange={(e) => update("contactoEmergenciaNombre", e.target.value)}
        />
        <Input
          label="Teléfono de emergencia"
          value={form.contactoEmergenciaTelefono}
          onChange={(e) => update("contactoEmergenciaTelefono", e.target.value)}
        />

        {!paciente && (
          <p className="text-xs text-slate-500 sm:col-span-2">
            Las aseguradoras del paciente se agregan luego de guardarlo, desde la pestaña "Seguros" de su ficha.
          </p>
        )}

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
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
