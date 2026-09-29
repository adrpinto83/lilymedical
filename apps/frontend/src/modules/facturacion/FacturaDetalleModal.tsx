import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Factura, MetodoPago } from "../../types";
import {
  abrirPdfFactura,
  anularFactura,
  anularPago,
  obtenerFactura,
  registrarPago,
} from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import {
  ESTADO_FACTURA,
  METODOS_PAGO,
  METODO_PAGO,
  bs,
  guardarTasa,
  redondear2,
  tasaGuardada,
  usd,
} from "./facturacionUtils";

// Detalle completo de una factura: servicios, reparto con el seguro, pagos
// (con anulación) y cobro mientras quede saldo.
export function FacturaDetalleModal({
  facturaId,
  onClose,
  onCambio,
}: {
  facturaId: string | null;
  onClose: () => void;
  onCambio: () => void;
}) {
  const [factura, setFactura] = useState<Factura | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recargar(id = facturaId) {
    if (!id) return;
    try {
      setFactura(await obtenerFactura(id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    setFactura(null);
    setError(null);
    recargar(facturaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facturaId]);

  if (!facturaId) return null;

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await recargar();
      onCambio();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleAnularPago(pagoId: string) {
    const motivo = window.prompt("Motivo de la anulación (ej. reembolso, monto mal digitado):");
    if (!motivo?.trim()) return;
    accion(() => anularPago(facturaId!, pagoId, motivo.trim()));
  }

  function handleAnularFactura() {
    if (!factura || !confirm(`¿Anular la factura ${factura.numeroFactura}? Esta acción no se puede deshacer.`)) return;
    accion(() => anularFactura(factura.id));
  }

  const titulo = factura ? `Factura ${factura.numeroFactura}` : "Factura";

  return (
    <Modal open onClose={onClose} title={titulo} wide>
      {!factura ? (
        <p className="text-sm text-slate-500">{error ?? "Cargando..."}</p>
      ) : (
        <Contenido
          factura={factura}
          error={error}
          onPagado={() => {
            recargar();
            onCambio();
          }}
          onAnularPago={handleAnularPago}
          onAnularFactura={handleAnularFactura}
          onPdf={() => accion(() => abrirPdfFactura(factura.id))}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function Contenido({
  factura,
  error,
  onPagado,
  onAnularPago,
  onAnularFactura,
  onPdf,
  onClose,
}: {
  factura: Factura;
  error: string | null;
  onPagado: () => void;
  onAnularPago: (pagoId: string) => void;
  onAnularFactura: () => void;
  onPdf: () => void;
  onClose: () => void;
}) {
  const saldo = Number(factura.saldo ?? factura.total);
  const pagos = factura.pagos ?? [];
  const tienePagosVigentes = pagos.some((p) => !p.anulado);
  const puedeCobrar = factura.estado !== "ANULADA" && saldo > 0;

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">
            {factura.paciente?.apellidos}, {factura.paciente?.nombres}
          </p>
          <p className="text-slate-500">
            C.I. {factura.paciente?.documento} · {format(new Date(factura.fecha), "dd/MM/yyyy")}
            {factura.aseguradora && ` · ${factura.aseguradora.nombre}`}
            {factura.autorizacion?.numeroAutorizacion && ` · Aut. N° ${factura.autorizacion.numeroAutorizacion}`}
          </p>
        </div>
        <Badge color={ESTADO_FACTURA[factura.estado].color}>{ESTADO_FACTURA[factura.estado].label}</Badge>
      </div>

      <table className="w-full">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="pb-1 font-medium">Servicio</th>
            <th className="pb-1 text-center font-medium">Cant.</th>
            <th className="pb-1 text-right font-medium">Precio</th>
            <th className="pb-1 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {factura.detalles?.map((d) => (
            <tr key={d.id}>
              <td className="py-1.5 text-slate-800">{d.descripcion ?? d.tarifa?.nombreServicio}</td>
              <td className="py-1.5 text-center text-slate-600">{d.cantidad}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-600">{usd(d.precioUnitario)}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-800">{usd(d.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 rounded-lg bg-slate-50 p-3">
        {Number(factura.impuestos) > 0 && <Fila etiqueta="Impuestos" valor={usd(factura.impuestos)} />}
        <Fila etiqueta="Total" valor={usd(factura.total)} fuerte />
        {factura.montoAseguradora != null && (
          <>
            <Fila etiqueta="Cubre la aseguradora" valor={usd(factura.montoAseguradora)} />
            <Fila etiqueta="A cargo del paciente" valor={usd(factura.montoPaciente)} />
          </>
        )}
        <Fila etiqueta="Pagado" valor={usd(factura.pagado)} />
        {factura.estado !== "ANULADA" && <Fila etiqueta="Saldo pendiente" valor={usd(saldo)} fuerte />}
      </div>

      {pagos.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Pagos</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className={p.anulado ? "text-slate-400 line-through" : "text-slate-700"}>
                  <span className="font-medium">{usd(p.monto)}</span> · {METODO_PAGO[p.metodoPago]?.label ?? p.metodoPago} ·{" "}
                  {format(new Date(p.fecha), "dd/MM/yyyy")}
                  {p.montoBs && p.tasaCambio && (
                    <span className="text-slate-500">
                      {" "}
                      · {bs(p.montoBs)} a {Number(p.tasaCambio).toLocaleString("es-VE")} Bs/$
                    </span>
                  )}
                  {p.referencia && <span className="text-slate-500"> · Ref. {p.referencia}</span>}
                </div>
                {p.anulado ? (
                  <span className="text-xs text-red-600" title={p.motivoAnulacion ?? undefined}>
                    Anulado{p.motivoAnulacion ? `: ${p.motivoAnulacion}` : ""}
                  </span>
                ) : (
                  factura.estado !== "ANULADA" && (
                    <button type="button" onClick={() => onAnularPago(p.id)} className="text-xs text-red-600 hover:underline">
                      Anular
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {puedeCobrar && (
        // La key reinicia el formulario (monto sugerido = nuevo saldo) tras cada pago.
        <FormularioPago key={String(factura.saldo)} factura={factura} saldo={saldo} onPagado={onPagado} />
      )}

      {error && <p className="text-red-600">{error}</p>}

      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onPdf}>
            Ver PDF
          </Button>
          {factura.estado !== "ANULADA" && (
            <Button
              type="button"
              variant="ghost"
              onClick={onAnularFactura}
              disabled={tienePagosVigentes}
              title={tienePagosVigentes ? "Anula primero los pagos (reembolso)" : undefined}
            >
              <span className="text-red-600">Anular factura</span>
            </Button>
          )}
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

function FormularioPago({ factura, saldo, onPagado }: { factura: Factura; saldo: number; onPagado: () => void }) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [enBs, setEnBs] = useState(false);
  const [monto, setMonto] = useState(saldo.toFixed(2));
  const [montoBs, setMontoBs] = useState("");
  const [tasa, setTasa] = useState(tasaGuardada);
  const [referencia, setReferencia] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasaNum = Number(tasa);
  const equivalenteUsd = enBs && tasaNum > 0 && Number(montoBs) > 0 ? redondear2(Number(montoBs) / tasaNum) : null;
  const metodo = METODO_PAGO[metodoPago];

  // Cuánto falta de cada parte: los pagos no distinguen quién pagó, así que
  // se asume que primero se cubre la parte del paciente.
  const pagado = Number(factura.pagado ?? 0);
  const pendientePaciente = factura.montoAseguradora != null ? Math.max(0, Number(factura.montoPaciente) - pagado) : null;

  function elegirMetodo(m: MetodoPago) {
    setMetodoPago(m);
    setEnBs(METODO_PAGO[m].enBs);
  }

  // Monto rápido en dólares; si se cobra en Bs, se convierte con la tasa.
  function usarMonto(v: number) {
    if (enBs && tasaNum > 0) setMontoBs(redondear2(v * tasaNum).toFixed(2));
    else setMonto(v.toFixed(2));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (enBs && !(tasaNum > 0)) {
      setError("Indica la tasa de cambio del día (Bs por dólar)");
      return;
    }
    setSaving(true);
    try {
      await registrarPago(factura.id, {
        metodoPago,
        referencia: referencia.trim() || undefined,
        ...(enBs ? { montoBs: Number(montoBs), tasaCambio: tasaNum } : { monto: Number(monto) }),
      });
      if (enBs) guardarTasa(tasa);
      onPagado();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-lily-blue-200 p-3">
      <p className="font-medium text-slate-800">Registrar pago</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          id="pago-metodo"
          label="Método"
          value={metodoPago}
          onChange={(e) => elegirMetodo(e.target.value as MetodoPago)}
        >
          {METODOS_PAGO.map((m) => (
            <option key={m} value={m}>
              {METODO_PAGO[m].label}
            </option>
          ))}
        </Select>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={enBs} onChange={(e) => setEnBs(e.target.checked)} />
          Pagado en bolívares
        </label>
      </div>

      {enBs ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="pago-tasa"
            label="Tasa del día (Bs por $)"
            type="number"
            step="0.0001"
            min={0}
            required
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
          />
          <Input
            id="pago-monto-bs"
            label="Monto recibido (Bs)"
            type="number"
            step="0.01"
            min={0}
            required
            value={montoBs}
            onChange={(e) => setMontoBs(e.target.value)}
            hint={equivalenteUsd !== null ? `Equivale a ${usd(equivalenteUsd)}` : undefined}
          />
        </div>
      ) : (
        <Input
          id="pago-monto"
          label="Monto ($)"
          type="number"
          step="0.01"
          min={0.01}
          max={saldo}
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      )}

      <div className="-mt-1 flex flex-wrap gap-1.5 text-xs">
        <MontoRapido onClick={() => usarMonto(saldo)}>Saldo completo {usd(saldo)}</MontoRapido>
        {pendientePaciente !== null && pendientePaciente > 0 && pendientePaciente < saldo && (
          <MontoRapido onClick={() => usarMonto(pendientePaciente)}>Parte del paciente {usd(pendientePaciente)}</MontoRapido>
        )}
      </div>

      {metodo.pideReferencia && (
        <Input
          id="pago-referencia"
          label="Referencia"
          placeholder={metodoPago === "PAGO_MOVIL" ? "Últimos dígitos de la operación" : "N° de operación o comprobante"}
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={saving} className="self-end">
        {saving ? "Registrando..." : "Registrar pago"}
      </Button>
    </form>
  );
}

function MontoRapido({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-300 px-2.5 py-0.5 text-slate-600 hover:bg-slate-50"
    >
      {children}
    </button>
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
