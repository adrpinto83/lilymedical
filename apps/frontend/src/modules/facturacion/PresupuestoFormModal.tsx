import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Paciente, Presupuesto, Tarifa } from "../../types";
import { listarPacientes } from "../../services/pacientes";
import { listarTarifas } from "../../services/facturacion";
import { obtenerHistoriaPorPaciente } from "../../services/historiasClinicas";
import { crearPresupuesto } from "../../services/presupuestos";
import { getErrorMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { bs, guardarTasa, redondear2, tasaGuardada, usd } from "./facturacionUtils";

interface Linea {
  tarifaId: string;
  descripcion: string;
  cantidad: string;
  precio: string;
}

const lineaVacia = (): Linea => ({ tarifaId: "", descripcion: "", cantidad: "1", precio: "" });

export function PresupuestoFormModal({
  open,
  onClose,
  onCreated,
  pacienteIdFijo,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (presupuesto: Presupuesto) => void;
  /** Desde el estado de cuenta del paciente: ya viene elegido. */
  pacienteIdFijo?: string;
}) {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tasa, setTasa] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    listarTarifas().then(setTarifas).catch(() => setTarifas([]));
    setBusqueda("");
    setPacienteId(pacienteIdFijo ?? "");
    setDiagnostico("");
    setTasa(tasaGuardada());
    setLineas([lineaVacia()]);
    setNotas("");
    setError(null);
  }, [open, pacienteIdFijo]);

  useEffect(() => {
    if (!open || pacienteIdFijo) return;
    const t = setTimeout(() => {
      listarPacientes(busqueda || undefined).then((lista) => {
        setPacientes(lista);
        if (busqueda && lista.length === 1) setPacienteId(lista[0].id);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [busqueda, open, pacienteIdFijo]);

  // El IDX sale de la historia solo si quien emite es el médico (el
  // personal administrativo no ve la historia; lo escribe a mano).
  useEffect(() => {
    if (!pacienteId || user?.rol !== "MEDICO") return;
    obtenerHistoriaPorPaciente(pacienteId)
      .then((h) => setDiagnostico(h.diagnosticoPrincipal ?? ""))
      .catch(() => undefined);
  }, [pacienteId, user?.rol]);

  function cambiarLinea(i: number, cambios: Partial<Linea>) {
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambios } : l)));
  }

  function elegirServicio(i: number, tarifaId: string) {
    const tarifa = tarifas.find((t) => t.id === tarifaId);
    cambiarLinea(i, tarifa ? { tarifaId, descripcion: tarifa.nombreServicio, precio: Number(tarifa.precio).toFixed(2) } : { tarifaId: "" });
  }

  const tasaNum = Number(tasa);
  const validas = lineas.filter((l) => l.descripcion.trim() && Number(l.cantidad) > 0 && l.precio !== "");
  const subtotal = (l: Linea) => redondear2(Number(l.cantidad) * Number(l.precio));
  const total = redondear2(validas.reduce((a, l) => a + subtotal(l), 0));
  const totalBs = tasaNum > 0 ? redondear2(validas.reduce((a, l) => a + redondear2(subtotal(l) * tasaNum), 0)) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validas.length === 0) {
      setError("Agrega al menos un servicio con cantidad y precio");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const presupuesto = await crearPresupuesto({
        pacienteId,
        diagnostico: diagnostico.trim() || undefined,
        tasaCambio: tasaNum > 0 ? tasaNum : undefined,
        notas: notas.trim() || undefined,
        items: validas.map((l) => ({
          tarifaId: l.tarifaId || undefined,
          descripcion: l.descripcion.trim(),
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precio),
        })),
      });
      if (tasaNum > 0) guardarTasa(tasa);
      onCreated(presupuesto);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo presupuesto" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {!pacienteIdFijo && (
          <div>
            <Input
              id="presupuesto-paciente"
              label="Paciente"
              placeholder="Buscar por nombre, cédula o teléfono"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Select
              aria-label="Paciente elegido"
              className="mt-2"
              required
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">Selecciona un paciente...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos}, {p.nombres} · {p.documento}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
          <Input
            id="presupuesto-idx"
            label="IDX (diagnóstico)"
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            placeholder="ej. Postoperatorio tardío de reparación mallet finger"
          />
          <Input
            id="presupuesto-tasa"
            label="Tasa BCV (Bs por $)"
            type="number"
            step="0.0001"
            min={0}
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            hint="Vacía: solo en dólares"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Servicios</span>
          {lineas.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_90px_auto] items-end gap-2 sm:grid-cols-[180px_1fr_70px_90px_auto]">
              <Select
                aria-label={`Servicio ${i + 1}`}
                className="col-span-4 sm:col-span-1"
                value={l.tarifaId}
                onChange={(e) => elegirServicio(i, e.target.value)}
              >
                <option value="">Otro (escribir)</option>
                {tarifas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombreServicio} · {usd(t.precio)}
                  </option>
                ))}
              </Select>
              <Input
                aria-label={`Descripción ${i + 1}`}
                placeholder="Descripción"
                value={l.descripcion}
                onChange={(e) => cambiarLinea(i, { descripcion: e.target.value })}
              />
              <Input
                aria-label={`Cantidad ${i + 1}`}
                type="number"
                min={1}
                value={l.cantidad}
                onChange={(e) => cambiarLinea(i, { cantidad: e.target.value })}
              />
              <Input
                aria-label={`Precio ${i + 1}`}
                type="number"
                step="0.01"
                min={0}
                placeholder="$"
                value={l.precio}
                onChange={(e) => cambiarLinea(i, { precio: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                aria-label={`Quitar servicio ${i + 1}`}
                disabled={lineas.length === 1}
                onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
              >
                ✕
              </Button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLineas((ls) => [...ls, lineaVacia()])}
            className="self-start text-sm text-lily-blue-700 hover:underline"
          >
            + Agregar servicio
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-6 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span>
            Total: <strong className="tabular-nums">{usd(total)}</strong>
          </span>
          {totalBs !== null && (
            <span>
              Total Bs BCV: <strong className="tabular-nums">{bs(totalBs)}</strong>
            </span>
          )}
        </div>

        <Textarea
          id="presupuesto-notas"
          label="Notas (opcional)"
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="ej. Incluye evaluación inicial. Válido por 15 días."
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creando..." : "Crear presupuesto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
