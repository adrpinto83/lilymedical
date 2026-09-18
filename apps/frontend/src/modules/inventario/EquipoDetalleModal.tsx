import { FormEvent, useCallback, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input, Select, Textarea } from "../../components/ui/Input";
import {
  EquipoDetalle,
  EstadoEquipo,
  TipoMantenimiento,
  obtenerEquipo,
  registrarMantenimiento,
} from "../../services/equipos";
import { getErrorMessage } from "../../services/api";
import {
  alertaMantenimiento,
  estadoEquipoColor,
  estadoEquipoLabel,
  fechaCorta,
  hoyInputFecha,
  tipoMantenimientoLabel,
} from "./equiposUi";

function formVacio() {
  return {
    tipo: "PREVENTIVO" as TipoMantenimiento,
    fecha: hoyInputFecha(),
    descripcion: "",
    realizadoPor: "",
    costo: "",
    estadoResultante: "OPERATIVO" as EstadoEquipo,
  };
}

function Dato({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

export function EquipoDetalleModal({
  equipoId,
  onClose,
  onChanged,
}: {
  equipoId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [equipo, setEquipo] = useState<EquipoDetalle | null>(null);
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(() => {
    if (!equipoId) return;
    obtenerEquipo(equipoId)
      .then((e) => {
        setEquipo(e);
        setForm((f) => ({ ...f, realizadoPor: f.realizadoPor || e.proveedorServicio || "" }));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [equipoId]);

  useEffect(() => {
    setEquipo(null);
    setForm(formVacio());
    setError(null);
    cargar();
  }, [cargar]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!equipoId) return;
    setSaving(true);
    setError(null);
    try {
      await registrarMantenimiento(equipoId, {
        tipo: form.tipo,
        fecha: form.fecha,
        descripcion: form.descripcion,
        realizadoPor: form.realizadoPor || undefined,
        costo: form.costo ? Number(form.costo) : undefined,
        estadoResultante: form.estadoResultante,
      });
      setForm({ ...formVacio(), realizadoPor: form.realizadoPor });
      cargar();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const alerta = equipo ? alertaMantenimiento(equipo.proximoMantenimiento) : null;
  const puedeRegistrar = equipo?.estado !== "DADO_DE_BAJA";

  return (
    <Modal open={!!equipoId} onClose={onClose} title={equipo?.nombre ?? "Equipo"} wide>
      {!equipo ? (
        <p className="text-sm text-slate-500">{error ?? "Cargando..."}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={estadoEquipoColor[equipo.estado]}>{estadoEquipoLabel[equipo.estado]}</Badge>
            {alerta && <Badge color={alerta.color}>Próximo mantenimiento: {alerta.texto}</Badge>}
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Dato label="Categoría" value={equipo.categoria} />
            <Dato label="Marca / modelo" value={[equipo.marca, equipo.modelo].filter(Boolean).join(" ")} />
            <Dato label="N° de serie" value={equipo.numeroSerie} />
            <Dato label="Ubicación" value={equipo.ubicacion} />
            <Dato label="Adquirido" value={fechaCorta(equipo.fechaAdquisicion)} />
            <Dato label="Garantía hasta" value={fechaCorta(equipo.garantiaHasta)} />
            <Dato label="Técnico / empresa" value={equipo.proveedorServicio} />
            <Dato
              label="Frecuencia preventiva"
              value={equipo.frecuenciaMantenimientoDias ? `Cada ${equipo.frecuenciaMantenimientoDias} días` : null}
            />
            <Dato label="Último preventivo" value={fechaCorta(equipo.ultimoMantenimiento)} />
          </dl>
          {equipo.notas && <p className="text-sm text-slate-600">{equipo.notas}</p>}

          {puedeRegistrar && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Registrar mantenimiento o falla</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Select
                  id="mt-tipo"
                  label="Tipo"
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoMantenimiento }))}
                >
                  {(Object.keys(tipoMantenimientoLabel) as TipoMantenimiento[]).map((t) => (
                    <option key={t} value={t}>
                      {tipoMantenimientoLabel[t]}
                    </option>
                  ))}
                </Select>
                <Input
                  id="mt-fecha"
                  label="Fecha"
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
                <Select
                  id="mt-estado"
                  label="El equipo queda"
                  value={form.estadoResultante}
                  onChange={(e) => setForm((f) => ({ ...f, estadoResultante: e.target.value as EstadoEquipo }))}
                >
                  <option value="OPERATIVO">Operativo</option>
                  <option value="EN_MANTENIMIENTO">En mantenimiento (retirado)</option>
                  <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
                </Select>
                <Input
                  id="mt-realizado"
                  label="Realizado por"
                  value={form.realizadoPor}
                  onChange={(e) => setForm((f) => ({ ...f, realizadoPor: e.target.value }))}
                />
                <Input
                  id="mt-costo"
                  label="Costo"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.costo}
                  onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
                />
              </div>
              <Textarea
                id="mt-descripcion"
                label="Descripción"
                required
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="ej. Revisión de cables y electrodos, prueba de intensidad de salida"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Registrar"}
                </Button>
              </div>
            </form>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Historial</h3>
            {equipo.mantenimientos.length === 0 ? (
              <p className="text-sm text-slate-500">Sin mantenimientos registrados.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {equipo.mantenimientos.map((m) => (
                  <li key={m.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">
                        {fechaCorta(m.fecha)} · {tipoMantenimientoLabel[m.tipo]}
                      </span>
                      {m.costo && <span className="text-slate-600">${Number(m.costo).toFixed(2)}</span>}
                    </div>
                    <p className="text-slate-700">{m.descripcion}</p>
                    <p className="text-xs text-slate-500">
                      {m.realizadoPor ? `Por ${m.realizadoPor} · ` : ""}registró {m.registradoPor.nombre}{" "}
                      {m.registradoPor.apellido}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
