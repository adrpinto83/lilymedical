import { FormEvent, useEffect, useState } from "react";
import clsx from "clsx";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Tarifa } from "../../types";
import { listarTarifas, crearTarifa, actualizarTarifa } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { usd } from "../facturacion/facturacionUtils";

interface FormServicio {
  nombreServicio: string;
  precio: string;
  descripcion: string;
}

const VACIO: FormServicio = { nombreServicio: "", precio: "", descripcion: "" };

// Catálogo de servicios del consultorio con su precio (tarifa). Se usa al
// agendar citas y al facturar. Un servicio no se borra: se desactiva, para
// que las citas y facturas que lo usaron sigan mostrándolo.
export function ServiciosPage() {
  const [servicios, setServicios] = useState<Tarifa[]>([]);
  const [nuevo, setNuevo] = useState<FormServicio>(VACIO);
  const [editando, setEditando] = useState<(FormServicio & { id: string }) | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function cargar() {
    listarTarifas(true)
      .then(setServicios)
      .catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function ejecutar(fn: () => Promise<unknown>, mensaje: string) {
    setSaving(true);
    setError(null);
    setAviso(null);
    try {
      await fn();
      cargar();
      setAviso(mensaje);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(
      () =>
        crearTarifa({
          nombreServicio: nuevo.nombreServicio.trim(),
          precio: Number(nuevo.precio),
          descripcion: nuevo.descripcion.trim() || undefined,
        }),
      `Servicio "${nuevo.nombreServicio.trim()}" agregado`
    );
    if (ok) setNuevo(VACIO);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const ok = await ejecutar(
      () =>
        actualizarTarifa(editando.id, {
          nombreServicio: editando.nombreServicio.trim(),
          precio: Number(editando.precio),
          descripcion: editando.descripcion.trim() || null,
        }),
      "Cambios guardados. Las facturas ya emitidas conservan su precio."
    );
    if (ok) setEditando(null);
  }

  function cambiarActivo(s: Tarifa, activo: boolean) {
    if (!activo && !confirm(`¿Desactivar "${s.nombreServicio}"? Ya no se podrá agendar ni facturar, pero puedes reactivarlo.`))
      return;
    ejecutar(
      () => actualizarTarifa(s.id, { activo }),
      activo ? `"${s.nombreServicio}" reactivado` : `"${s.nombreServicio}" desactivado`
    );
  }

  const texto = busqueda.trim().toLowerCase();
  const visibles = servicios.filter(
    (s) =>
      (verInactivos || s.activo) &&
      (!texto || s.nombreServicio.toLowerCase().includes(texto) || s.descripcion?.toLowerCase().includes(texto))
  );
  const inactivos = servicios.filter((s) => !s.activo).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Servicios</h1>
        <p className="text-sm text-slate-500">
          Servicios que ofrece el consultorio y su precio en dólares. Se usan al agendar citas y al facturar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Agregar servicio</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={crear} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_3fr_auto]">
            <Input
              id="nuevo-nombre"
              label="Nombre"
              required
              placeholder="ej. Sesión de magnetoterapia"
              value={nuevo.nombreServicio}
              onChange={(e) => setNuevo((f) => ({ ...f, nombreServicio: e.target.value }))}
            />
            <Input
              id="nuevo-precio"
              label="Precio ($)"
              type="number"
              step="0.01"
              min={0.01}
              required
              value={nuevo.precio}
              onChange={(e) => setNuevo((f) => ({ ...f, precio: e.target.value }))}
            />
            <Input
              id="nuevo-descripcion"
              label="Descripción (opcional)"
              placeholder="ej. 20 minutos, incluye evaluación"
              value={nuevo.descripcion}
              onChange={(e) => setNuevo((f) => ({ ...f, descripcion: e.target.value }))}
            />
            <Button type="submit" disabled={saving}>
              Agregar
            </Button>
          </form>
        </CardBody>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {aviso && <p className="rounded-lg bg-lily-green-50 px-3 py-2 text-sm text-lily-green-700">{aviso}</p>}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Catálogo ({servicios.filter((s) => s.activo).length} activos)
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              aria-label="Buscar servicio"
              placeholder="Buscar servicio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-56"
            />
            {inactivos > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
                Ver desactivados ({inactivos})
              </label>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {visibles.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No hay servicios que coincidan.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibles.map((s) =>
                editando?.id === s.id ? (
                  <li key={s.id} className="bg-lily-blue-50/50 p-4">
                    <form onSubmit={guardar} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_3fr_auto]">
                      <Input
                        id="editar-nombre"
                        label="Nombre"
                        required
                        value={editando.nombreServicio}
                        onChange={(e) => setEditando({ ...editando, nombreServicio: e.target.value })}
                      />
                      <Input
                        id="editar-precio"
                        label="Precio ($)"
                        type="number"
                        step="0.01"
                        min={0.01}
                        required
                        value={editando.precio}
                        onChange={(e) => setEditando({ ...editando, precio: e.target.value })}
                      />
                      <Input
                        id="editar-descripcion"
                        label="Descripción"
                        value={editando.descripcion}
                        onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={saving}>
                          Guardar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={s.id}
                    className={clsx("flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm", !s.activo && "bg-slate-50")}
                  >
                    <div className="min-w-0">
                      <p className={clsx("font-medium", s.activo ? "text-slate-900" : "text-slate-400")}>
                        {s.nombreServicio} {!s.activo && <Badge color="slate">Desactivado</Badge>}
                      </p>
                      {s.descripcion && <p className="text-xs text-slate-500">{s.descripcion}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold tabular-nums text-slate-900">{usd(s.precio)}</span>
                      {s.activo ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setEditando({
                                id: s.id,
                                nombreServicio: s.nombreServicio,
                                precio: String(s.precio),
                                descripcion: s.descripcion ?? "",
                              })
                            }
                          >
                            Editar
                          </Button>
                          <Button variant="ghost" onClick={() => cambiarActivo(s, false)}>
                            <span className="text-red-600">Desactivar</span>
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" onClick={() => cambiarActivo(s, true)}>
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
