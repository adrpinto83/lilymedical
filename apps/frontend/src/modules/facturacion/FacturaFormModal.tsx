import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { es } from "date-fns/locale";
import { Modal } from "../../components/ui/Modal";
import { Input, Select, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { AutorizacionSeguro, Factura, Paciente, PacienteAseguradora, Tarifa } from "../../types";
import { listarAseguradorasPaciente, listarPacientes } from "../../services/pacientes";
import { listarAutorizacionesPaciente } from "../../services/autorizaciones";
import {
  CitaPorFacturar,
  crearFactura,
  listarCitasPorFacturar,
  listarTarifas,
} from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { calcularSplit, usd } from "./facturacionUtils";

interface DetalleForm {
  tarifaId: string;
  cantidad: number;
  descripcion: string;
  /** Presente cuando la línea sale de una sesión atendida. */
  citaId?: string;
}

const lineaVacia = (): DetalleForm => ({ tarifaId: "", cantidad: 1, descripcion: "" });

export function FacturaFormModal({
  open,
  onClose,
  onCreated,
  pacienteIdFijo,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (factura: Factura) => void;
  pacienteIdFijo?: string;
}) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pacienteId, setPacienteId] = useState(pacienteIdFijo ?? "");
  const [seguros, setSeguros] = useState<PacienteAseguradora[]>([]);
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionSeguro[]>([]);
  const [aseguradoraId, setAseguradoraId] = useState("");
  const [citasPendientes, setCitasPendientes] = useState<CitaPorFacturar[]>([]);
  const [detalles, setDetalles] = useState<DetalleForm[]>([lineaVacia()]);
  const [impuestos, setImpuestos] = useState("0");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cada apertura empieza limpia.
  useEffect(() => {
    if (!open) return;
    listarTarifas().then(setTarifas).catch(() => setTarifas([]));
    setPacienteId(pacienteIdFijo ?? "");
    setBusqueda("");
    setDetalles([lineaVacia()]);
    setImpuestos("0");
    setNotas("");
    setError(null);
  }, [open, pacienteIdFijo]);

  useEffect(() => {
    if (!open || pacienteIdFijo) return;
    const timeout = setTimeout(() => {
      listarPacientes(busqueda || undefined).then((lista) => {
        setPacientes(lista);
        if (busqueda && lista.length === 1) setPacienteId(lista[0].id);
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [busqueda, open, pacienteIdFijo]);

  // Al elegir paciente: sus seguros, autorizaciones y sesiones sin facturar.
  useEffect(() => {
    setSeguros([]);
    setAutorizaciones([]);
    setCitasPendientes([]);
    setAseguradoraId("");
    if (!open || !pacienteId) return;
    listarAseguradorasPaciente(pacienteId)
      .then((lista) => {
        const activos = lista.filter((s) => s.aseguradora?.activo !== false);
        setSeguros(activos);
        // Por defecto se factura al seguro primario, como en la práctica diaria.
        setAseguradoraId(activos.find((s) => s.esPrimaria)?.aseguradoraId ?? "");
      })
      .catch(() => setSeguros([]));
    listarAutorizacionesPaciente(pacienteId).then(setAutorizaciones).catch(() => setAutorizaciones([]));
    listarCitasPorFacturar(pacienteId).then(setCitasPendientes).catch(() => setCitasPendientes([]));
  }, [open, pacienteId]);

  function actualizarDetalle(index: number, cambios: Partial<DetalleForm>) {
    setDetalles((d) => d.map((det, i) => (i === index ? { ...det, ...cambios } : det)));
  }

  const tarifaPorId = (id: string) => tarifas.find((t) => t.id === id);
  const citaEnFactura = (id: string) => detalles.some((d) => d.citaId === id);

  function descripcionCita(c: CitaPorFacturar, tarifa?: Tarifa) {
    const sesion = c.totalSesionesGrupo ? ` (sesión ${c.numeroSesionEnGrupo}/${c.totalSesionesGrupo})` : "";
    return `${tarifa?.nombreServicio ?? "Sesión"} ${format(new Date(c.fechaHoraInicio), "dd/MM/yyyy")}${sesion}`;
  }

  function toggleCita(c: CitaPorFacturar) {
    if (citaEnFactura(c.id)) {
      setDetalles((d) => {
        const resto = d.filter((x) => x.citaId !== c.id);
        return resto.length ? resto : [lineaVacia()];
      });
      return;
    }
    const tarifa = c.tarifa && tarifaPorId(c.tarifa.id) ? c.tarifa : undefined;
    const nueva: DetalleForm = {
      tarifaId: tarifa?.id ?? "",
      cantidad: 1,
      descripcion: descripcionCita(c, tarifa),
      citaId: c.id,
    };
    // Reemplaza la línea vacía inicial en lugar de dejarla colgando.
    setDetalles((d) => [...d.filter((x) => x.tarifaId || x.citaId), nueva]);
  }

  function agregarTodas() {
    for (const c of citasPendientes) if (!citaEnFactura(c.id)) toggleCita(c);
  }

  const lineas = detalles.filter((d) => d.tarifaId);
  const subtotal = lineas.reduce((acc, d) => acc + Number(tarifaPorId(d.tarifaId)?.precio ?? 0) * d.cantidad, 0);
  const total = subtotal + Number(impuestos || 0);
  const unidades = lineas.reduce((acc, d) => acc + d.cantidad, 0);
  const seguro = seguros.find((s) => s.aseguradoraId === aseguradoraId)?.aseguradora ?? null;
  const split = calcularSplit(total, seguro, unidades);

  const autorizacionesVigentes = autorizaciones.filter(
    (a) =>
      a.aseguradoraId === aseguradoraId &&
      a.estado === "APROBADA" &&
      (!a.vigenciaHasta || new Date(a.vigenciaHasta) >= new Date(new Date().toDateString()))
  );
  const lineasSinServicio = detalles.some((d) => d.citaId && !d.tarifaId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (lineas.length === 0) {
      setError("Agrega al menos un servicio");
      return;
    }
    if (lineasSinServicio) {
      setError("Elige el servicio de las sesiones que no tienen tarifa");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const factura = await crearFactura({
        pacienteId,
        aseguradoraId: aseguradoraId || undefined,
        impuestos: Number(impuestos || 0),
        notas: notas.trim() || undefined,
        detalles: lineas.map((d) => ({
          tarifaId: d.tarifaId,
          cantidad: d.cantidad,
          citaId: d.citaId,
          descripcion: d.descripcion.trim() || undefined,
        })),
      });
      onCreated(factura);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva factura" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {!pacienteIdFijo && (
          <div>
            <Input
              label="Paciente"
              placeholder="Buscar por nombre, cédula o teléfono"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Select className="mt-2" required value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Selecciona un paciente...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos}, {p.nombres} · {p.documento}
                </option>
              ))}
            </Select>
          </div>
        )}

        {pacienteId && (
          <Select
            id="factura-seguro"
            label="Facturar a"
            value={aseguradoraId}
            onChange={(e) => setAseguradoraId(e.target.value)}
            hint={
              seguro
                ? `Cobertura ${seguro.porcentajeCobertura ?? 100}%` +
                  (seguro.topeMontoPorSesion ? ` · tope ${usd(seguro.topeMontoPorSesion)} por sesión` : "") +
                  (seguro.requiereAutorizacion ? " · exige autorización previa" : "")
                : seguros.length === 0
                  ? "El paciente no tiene seguros registrados"
                  : undefined
            }
          >
            <option value="">Particular (paga el paciente)</option>
            {seguros.map((s) => (
              <option key={s.aseguradoraId} value={s.aseguradoraId}>
                {s.aseguradora?.nombre}
                {s.esPrimaria ? " (primario)" : ""}
                {s.numeroAfiliacion ? ` · N° ${s.numeroAfiliacion}` : ""}
              </option>
            ))}
          </Select>
        )}

        {seguro?.requiereAutorizacion && (
          <p
            className={`rounded-lg px-3 py-2 text-xs ${
              autorizacionesVigentes.length
                ? "bg-lily-green-50 text-lily-green-700"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {autorizacionesVigentes.length
              ? `Autorización vigente: ${autorizacionesVigentes
                  .map(
                    (a) =>
                      `${a.numeroAutorizacion ?? "sin número"} (${
                        a.sesionesRestantes == null ? "sin límite" : `quedan ${a.sesionesRestantes} sesiones`
                      })`
                  )
                  .join(", ")}`
              : "⚠ No hay una autorización aprobada y vigente: la factura será rechazada. Regístrala en la ficha del paciente → Seguros."}
          </p>
        )}

        {citasPendientes.length > 0 && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Sesiones atendidas sin facturar ({citasPendientes.length})
              </span>
              <button type="button" onClick={agregarTodas} className="text-xs text-lily-blue-700 hover:underline">
                Agregar todas
              </button>
            </div>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {citasPendientes.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={citaEnFactura(c.id)} onChange={() => toggleCita(c)} />
                  <span className="capitalize">
                    {format(new Date(c.fechaHoraInicio), "EEE d MMM yyyy", { locale: es })}
                  </span>
                  <span className="text-slate-500">
                    · {c.tarifa?.nombreServicio ?? "sin servicio"}
                    {c.totalSesionesGrupo ? ` · sesión ${c.numeroSesionEnGrupo}/${c.totalSesionesGrupo}` : ""}
                  </span>
                  {c.tarifa && <span className="ml-auto text-slate-500">{usd(c.tarifa.precio)}</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Servicios</span>
          {detalles.map((d, i) => {
            const tarifa = tarifaPorId(d.tarifaId);
            return (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Select
                    aria-label="Servicio"
                    value={d.tarifaId}
                    onChange={(e) => {
                      const t = tarifaPorId(e.target.value);
                      actualizarDetalle(i, {
                        tarifaId: e.target.value,
                        // La descripción de una línea libre sigue al servicio elegido.
                        ...(d.citaId ? {} : { descripcion: t?.nombreServicio ?? "" }),
                      });
                    }}
                    error={d.citaId && !d.tarifaId ? "Elige el servicio de esta sesión" : undefined}
                  >
                    <option value="">Selecciona un servicio...</option>
                    {tarifas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombreServicio} · {usd(t.precio)}
                      </option>
                    ))}
                  </Select>
                  <input
                    aria-label="Descripción en la factura"
                    placeholder="Descripción en la factura (opcional)"
                    value={d.descripcion}
                    onChange={(e) => actualizarDetalle(i, { descripcion: e.target.value })}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                  />
                </div>
                <Input
                  type="number"
                  aria-label="Cantidad"
                  min={1}
                  className="w-20"
                  value={d.cantidad}
                  disabled={!!d.citaId}
                  title={d.citaId ? "Una sesión se factura una vez" : undefined}
                  onChange={(e) => actualizarDetalle(i, { cantidad: Math.max(1, Number(e.target.value)) })}
                />
                <span className="w-24 text-right text-sm font-medium text-slate-700">
                  {usd(Number(tarifa?.precio ?? 0) * d.cantidad)}
                </span>
                <button
                  type="button"
                  aria-label="Quitar línea"
                  className="px-1 text-slate-400 hover:text-red-500"
                  onClick={() =>
                    setDetalles((prev) => {
                      const resto = prev.filter((_, idx) => idx !== i);
                      return resto.length ? resto : [lineaVacia()];
                    })
                  }
                >
                  ✕
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDetalles((prev) => [...prev, lineaVacia()])}
            >
              + Agregar línea
            </Button>
            <Link to="/servicios" className="text-xs text-slate-500 hover:underline" onClick={onClose}>
              ¿Falta un servicio o cambió un precio? Gestiónalo en Servicios
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Input
              label="Impuestos ($)"
              type="number"
              step="0.01"
              min={0}
              value={impuestos}
              onChange={(e) => setImpuestos(e.target.value)}
              hint="Los servicios médicos suelen estar exentos de IVA"
            />
            <Textarea label="Notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1 self-start rounded-lg bg-slate-50 p-3 text-sm">
            <Fila etiqueta="Subtotal" valor={usd(subtotal)} />
            {Number(impuestos) > 0 && <Fila etiqueta="Impuestos" valor={usd(impuestos)} />}
            <Fila etiqueta="Total" valor={usd(total)} fuerte />
            {split.aseguradora !== null && (
              <>
                <div className="my-1 border-t border-slate-200" />
                <Fila etiqueta={`Cubre ${seguro?.nombre}`} valor={usd(split.aseguradora)} />
                <Fila etiqueta="A cargo del paciente" valor={usd(split.paciente)} fuerte />
              </>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !pacienteId}>
            {saving ? "Guardando..." : `Emitir factura por ${usd(total)}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${fuerte ? "font-semibold text-slate-900" : "text-slate-600"}`}>
      <span>{etiqueta}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}
