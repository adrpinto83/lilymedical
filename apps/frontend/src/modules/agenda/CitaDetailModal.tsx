import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Cita, EstadoCita, Tarifa } from "../../types";
import { Profesional } from "../../services/usuarios";
import { actualizarCita, cancelarGrupoRecurrente, listarGrupoRecurrente } from "../../services/citas";
import { listarTarifas } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { differenceInMinutes, format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ESTADO_CITA, citaPendiente, enlaceWhatsApp, nombrePaciente } from "./agendaUtils";
import { mensajeRecordatorio } from "./ListView";

export function CitaDetailModal({
  cita,
  profesionales,
  puedeGestionar,
  onClose,
  onUpdated,
}: {
  cita: Cita | null;
  profesionales: Profesional[];
  puedeGestionar: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [paquete, setPaquete] = useState<Cita[] | null>(null);

  useEffect(() => {
    setError(null);
    setEditando(false);
    setPaquete(null);
    if (cita?.grupoRecurrenciaId) {
      listarGrupoRecurrente(cita.grupoRecurrenciaId).then(setPaquete).catch(() => setPaquete(null));
    }
  }, [cita]);

  if (!cita) return null;

  const inicio = new Date(cita.fechaHoraInicio);
  const fin = new Date(cita.fechaHoraFin);
  const whatsapp = enlaceWhatsApp(cita.paciente?.telefono, mensajeRecordatorio(cita));

  async function guardar(cambios: Parameters<typeof actualizarCita>[1]) {
    setSaving(true);
    setError(null);
    try {
      await actualizarCita(cita!.id, cambios);
      onUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function cambiarEstado(estado: EstadoCita) {
    if (estado === "CANCELADA" && !confirm("¿Cancelar esta cita? El horario quedará libre.")) return;
    guardar({ estado });
  }

  async function cancelarPaquete() {
    const pendientes = paquete?.filter((c) => citaPendiente(c.estado)).length ?? 0;
    if (!confirm(`¿Cancelar las ${pendientes} sesiones pendientes de este paquete?`)) return;
    setSaving(true);
    setError(null);
    try {
      await cancelarGrupoRecurrente(cita!.grupoRecurrenciaId!);
      onUpdated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!cita} onClose={onClose} title={editando ? "Reprogramar / editar cita" : "Detalle de la cita"}>
      {editando ? (
        <EditarCitaForm
          cita={cita}
          profesionales={profesionales}
          saving={saving}
          error={error}
          onCancel={() => {
            setEditando(false);
            setError(null);
          }}
          onSave={guardar}
        />
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">{nombrePaciente(cita)}</p>
              {cita.paciente?.telefono && (
                <p className="flex flex-wrap items-center gap-2 text-slate-500">
                  <a href={`tel:${cita.paciente.telefono}`} className="hover:underline">
                    {cita.paciente.telefono}
                  </a>
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-lily-green-700 hover:underline"
                    >
                      Enviar recordatorio por WhatsApp
                    </a>
                  )}
                </p>
              )}
            </div>
            <Badge color={ESTADO_CITA[cita.estado].badge}>{ESTADO_CITA[cita.estado].label}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
            <Dato titulo="Fecha">
              <span className="capitalize">{format(inicio, "EEEE d 'de' MMMM yyyy", { locale: es })}</span>
            </Dato>
            <Dato titulo="Hora">
              {format(inicio, "HH:mm")} – {format(fin, "HH:mm")}{" "}
              <span className="text-slate-500">({differenceInMinutes(fin, inicio)} min)</span>
            </Dato>
            <Dato titulo="Profesional">
              {cita.profesional?.nombre} {cita.profesional?.apellido}
            </Dato>
            <Dato titulo="Servicio">{cita.tarifa?.nombreServicio ?? "—"}</Dato>
            {cita.notas && (
              <div className="col-span-2">
                <Dato titulo="Notas">{cita.notas}</Dato>
              </div>
            )}
          </div>

          {cita.esRecurrente && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 font-medium text-slate-700">
                Paquete de sesiones · sesión {cita.numeroSesionEnGrupo} de {cita.totalSesionesGrupo}
                {paquete && (
                  <span className="ml-2 font-normal text-slate-500">
                    ({paquete.filter((c) => c.estado === "ATENDIDA").length} atendidas,{" "}
                    {paquete.filter((c) => citaPendiente(c.estado)).length} pendientes)
                  </span>
                )}
              </p>
              {paquete && (
                <div className="flex flex-wrap gap-1">
                  {paquete.map((s) => (
                    <span
                      key={s.id}
                      title={`Sesión ${s.numeroSesionEnGrupo} · ${format(new Date(s.fechaHoraInicio), "dd/MM HH:mm")} · ${ESTADO_CITA[s.estado].label}`}
                      className={clsx(
                        "flex h-6 min-w-6 items-center justify-center rounded px-1 text-[11px] font-medium text-white",
                        ESTADO_CITA[s.estado].punto,
                        s.id === cita.id && "ring-2 ring-slate-900 ring-offset-1"
                      )}
                    >
                      {s.numeroSesionEnGrupo}
                    </span>
                  ))}
                </div>
              )}
              {puedeGestionar && paquete?.some((c) => citaPendiente(c.estado)) && (
                <button
                  type="button"
                  onClick={cancelarPaquete}
                  disabled={saving}
                  className="mt-2 text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Cancelar todas las sesiones pendientes del paquete
                </button>
              )}
            </div>
          )}

          {puedeGestionar && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Acciones</p>
              <div className="flex flex-wrap gap-2">
                {cita.estado === "PROGRAMADA" && (
                  <Button type="button" disabled={saving} onClick={() => cambiarEstado("CONFIRMADA")}>
                    ✓ Confirmar
                  </Button>
                )}
                {citaPendiente(cita.estado) && (
                  <>
                    <Button
                      type="button"
                      variant={cita.estado === "CONFIRMADA" ? "primary" : "secondary"}
                      disabled={saving}
                      onClick={() => cambiarEstado("ATENDIDA")}
                    >
                      Marcar atendida
                    </Button>
                    <Button type="button" variant="secondary" disabled={saving} onClick={() => cambiarEstado("NO_ASISTIO")}>
                      No asistió
                    </Button>
                  </>
                )}
                {cita.estado !== "ATENDIDA" && (
                  <Button type="button" variant="secondary" disabled={saving} onClick={() => setEditando(true)}>
                    Reprogramar / editar
                  </Button>
                )}
                {citaPendiente(cita.estado) && (
                  <Button type="button" variant="ghost" disabled={saving} onClick={() => cambiarEstado("CANCELADA")}>
                    <span className="text-red-600">Cancelar cita</span>
                  </Button>
                )}
                {!citaPendiente(cita.estado) && (
                  <Button type="button" variant="ghost" disabled={saving} onClick={() => cambiarEstado("PROGRAMADA")}>
                    {cita.estado === "ATENDIDA" ? "Deshacer: volver a programada" : "Reactivar cita"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-red-600">{error}</p>}

          <div className="flex justify-between border-t border-slate-100 pt-3">
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
      )}
    </Modal>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="text-slate-900">{children}</p>
    </div>
  );
}

function EditarCitaForm({
  cita,
  profesionales,
  saving,
  error,
  onCancel,
  onSave,
}: {
  cita: Cita;
  profesionales: Profesional[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (cambios: Parameters<typeof actualizarCita>[1]) => void;
}) {
  const inicio = new Date(cita.fechaHoraInicio);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [form, setForm] = useState({
    fecha: format(inicio, "yyyy-MM-dd"),
    hora: format(inicio, "HH:mm"),
    duracionMinutos: differenceInMinutes(new Date(cita.fechaHoraFin), inicio),
    profesionalId: cita.profesionalId,
    tarifaId: cita.tarifaId ?? "",
    notas: cita.notas ?? "",
  });

  useEffect(() => {
    listarTarifas().then(setTarifas).catch(() => setTarifas([]));
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nuevoInicio = new Date(`${form.fecha}T${form.hora}:00`);
    const nuevoFin = new Date(nuevoInicio.getTime() + form.duracionMinutos * 60000);
    onSave({
      fechaHoraInicio: nuevoInicio.toISOString(),
      fechaHoraFin: nuevoFin.toISOString(),
      profesionalId: form.profesionalId,
      tarifaId: form.tarifaId || null,
      notas: form.notas || null,
      // Una cita cancelada o no asistida que se mueve a otra fecha vuelve a quedar programada.
      ...(citaPendiente(cita.estado) ? {} : { estado: "PROGRAMADA" as const }),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        {nombrePaciente(cita)}
        {!citaPendiente(cita.estado) && (
          <span className="mt-1 block text-xs text-amber-700">
            Al guardar, la cita volverá a quedar como programada.
          </span>
        )}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Fecha"
          type="date"
          required
          value={form.fecha}
          onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
        />
        <Input
          label="Hora"
          type="time"
          required
          value={form.hora}
          onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
        />
        <Input
          label="Duración (min)"
          type="number"
          min={15}
          step={5}
          required
          value={form.duracionMinutos}
          onChange={(e) => setForm((f) => ({ ...f, duracionMinutos: Number(e.target.value) }))}
        />
      </div>
      <Select
        label="Profesional"
        required
        value={form.profesionalId}
        onChange={(e) => setForm((f) => ({ ...f, profesionalId: e.target.value }))}
      >
        {!profesionales.some((p) => p.id === cita.profesionalId) && cita.profesional && (
          <option value={cita.profesionalId}>
            {cita.profesional.nombre} {cita.profesional.apellido}
          </option>
        )}
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
      <Input label="Notas" value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Volver
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
