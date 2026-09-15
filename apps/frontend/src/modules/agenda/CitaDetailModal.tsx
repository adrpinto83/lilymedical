import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Cita, EstadoCita } from "../../types";
import { actualizarCita } from "../../services/citas";
import { getErrorMessage } from "../../services/api";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const estados: EstadoCita[] = ["PROGRAMADA", "CONFIRMADA", "ATENDIDA", "CANCELADA", "NO_ASISTIO"];
const estadoLabel: Record<EstadoCita, string> = {
  PROGRAMADA: "Programada",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  NO_ASISTIO: "No asistió",
};

export function CitaDetailModal({
  cita,
  onClose,
  onUpdated,
}: {
  cita: Cita | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cita) return null;

  async function cambiarEstado(estado: EstadoCita) {
    setSaving(true);
    setError(null);
    try {
      await actualizarCita(cita!.id, { estado } as any);
      onUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!cita} onClose={onClose} title="Detalle de la cita">
      <div className="flex flex-col gap-4 text-sm">
        <div>
          <p className="text-base font-semibold text-slate-900">
            {cita.paciente?.apellidos}, {cita.paciente?.nombres}
          </p>
          <p className="text-slate-500">{cita.paciente?.telefono}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-500">Fecha</p>
            <p className="text-slate-900">{format(new Date(cita.fechaHoraInicio), "dd/MM/yyyy")}</p>
          </div>
          <div>
            <p className="text-slate-500">Hora</p>
            <p className="text-slate-900">
              {format(new Date(cita.fechaHoraInicio), "HH:mm")} - {format(new Date(cita.fechaHoraFin), "HH:mm")}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Profesional</p>
            <p className="text-slate-900">
              {cita.profesional?.nombre} {cita.profesional?.apellido}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Servicio</p>
            <p className="text-slate-900">{cita.tarifa?.nombreServicio ?? "—"}</p>
          </div>
        </div>

        {cita.esRecurrente && (
          <Badge color="blue">
            Sesión {cita.numeroSesionEnGrupo} de {cita.totalSesionesGrupo}
          </Badge>
        )}

        {cita.notas && (
          <div>
            <p className="text-slate-500">Notas</p>
            <p className="text-slate-900">{cita.notas}</p>
          </div>
        )}

        <Select
          label="Estado"
          value={cita.estado}
          disabled={saving}
          onChange={(e) => cambiarEstado(e.target.value as EstadoCita)}
        >
          {estados.map((e) => (
            <option key={e} value={e}>
              {estadoLabel[e]}
            </option>
          ))}
        </Select>

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex justify-between">
          <Link to={`/pacientes/${cita.pacienteId}`}>
            <Button type="button" variant="ghost">
              Ver ficha del paciente
            </Button>
          </Link>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
