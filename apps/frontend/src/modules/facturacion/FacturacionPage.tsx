import { useEffect, useState, useCallback } from "react";
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Factura } from "../../types";
import { listarFacturas } from "../../services/facturacion";
import { getErrorMessage } from "../../services/api";
import { FacturaFormModal } from "./FacturaFormModal";
import { FacturaDetalleModal } from "./FacturaDetalleModal";
import { AseguradorasPanel } from "./AseguradorasPanel";
import { ESTADO_FACTURA, usd } from "./facturacionUtils";

type Periodo = "mes" | "mesAnterior" | "30" | "90" | "todo";

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "mesAnterior", etiqueta: "Mes anterior" },
  { valor: "30", etiqueta: "Últimos 30 días" },
  { valor: "90", etiqueta: "Últimos 90 días" },
  { valor: "todo", etiqueta: "Todo" },
];

function rango(periodo: Periodo): { desde?: string; hasta?: string } {
  const hoy = new Date();
  switch (periodo) {
    case "mes":
      return { desde: startOfMonth(hoy).toISOString(), hasta: endOfDay(hoy).toISOString() };
    case "mesAnterior": {
      const m = subMonths(hoy, 1);
      return { desde: startOfMonth(m).toISOString(), hasta: endOfMonth(m).toISOString() };
    }
    case "30":
    case "90":
      return { desde: startOfDay(subDays(hoy, Number(periodo))).toISOString(), hasta: endOfDay(hoy).toISOString() };
    case "todo":
      return {};
  }
}

type Seccion = "facturas" | "aseguradoras";

export function FacturacionPage() {
  const [seccion, setSeccion] = useState<Seccion>("facturas");
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [facturaAbierta, setFacturaAbierta] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setFacturas(await listarFacturas({ ...rango(periodo), estado: estado || undefined, q: q || undefined }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [periodo, estado, q]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const vigentes = facturas.filter((f) => f.estado !== "ANULADA");
  const facturado = vigentes.reduce((a, f) => a + Number(f.total), 0);
  const cobrado = vigentes.reduce((a, f) => a + Number(f.pagado ?? 0), 0);
  const porCobrar = vigentes.reduce((a, f) => a + Number(f.saldo ?? 0), 0);
  const conSaldo = vigentes.filter((f) => Number(f.saldo) > 0).length;
  const deSeguros = vigentes.filter((f) => f.aseguradora).reduce((a, f) => a + Number(f.montoAseguradora ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Facturación</h1>
          <p className="text-sm text-slate-500">
            Montos en dólares; los pagos en bolívares guardan su tasa. Precios en{" "}
            <Link to="/servicios" className="text-lily-blue-700 hover:underline">
              Servicios
            </Link>
            .
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nueva factura</Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ["facturas", "Facturas"],
            ["aseguradoras", "Aseguradoras"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            onClick={() => setSeccion(valor)}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-medium",
              seccion === valor
                ? "border-lily-blue-600 text-lily-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {seccion === "aseguradoras" && <AseguradorasPanel />}

      {seccion === "facturas" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador titulo="Facturado" valor={usd(facturado)} detalle={`${vigentes.length} factura(s)`} />
            <Indicador titulo="Cobrado" valor={usd(cobrado)} detalle={facturado ? `${Math.round((cobrado / facturado) * 100)}% de lo facturado` : "—"} />
            <Indicador
              titulo="Por cobrar"
              valor={usd(porCobrar)}
              detalle={`${conSaldo} factura(s) con saldo`}
              onClick={conSaldo ? () => setEstado("CON_SALDO") : undefined}
            />
            <Indicador titulo="Cubierto por seguros" valor={usd(deSeguros)} detalle="Parte de las aseguradoras" />
          </div>

          <Card>
            <CardHeader className="flex flex-wrap items-center gap-3">
              <Input
                aria-label="Buscar"
                placeholder="Buscar por N° de factura, paciente o cédula"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-72"
              />
              <Select aria-label="Periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="w-44">
                {PERIODOS.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.etiqueta}
                  </option>
                ))}
              </Select>
              <Select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="w-48">
                <option value="">Todos los estados</option>
                <option value="CON_SALDO">Con saldo pendiente</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PARCIAL">Pago parcial</option>
                <option value="PAGADA">Pagada</option>
                <option value="ANULADA">Anulada</option>
              </Select>
              {cargando && <span className="text-xs text-slate-400">Cargando...</span>}
            </CardHeader>
            <CardBody className="overflow-x-auto p-0">
              {error && <p className="p-4 text-sm text-red-600">{error}</p>}
              {!cargando && facturas.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No hay facturas con estos filtros.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Factura</th>
                      <th className="px-4 py-3">Paciente</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Facturado a</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facturas.map((f) => {
                      const saldo = Number(f.saldo ?? 0);
                      const cobrable = f.estado === "PENDIENTE" || f.estado === "PARCIAL";
                      return (
                        <tr
                          key={f.id}
                          className={clsx("cursor-pointer hover:bg-lily-blue-50", f.estado === "ANULADA" && "text-slate-400")}
                          onClick={() => setFacturaAbierta(f.id)}
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">{f.numeroFactura}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {f.paciente?.apellidos}, {f.paciente?.nombres}
                            <span className="block text-xs text-slate-400">C.I. {f.paciente?.documento}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{format(new Date(f.fecha), "dd/MM/yyyy")}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {f.aseguradora ? (
                              <>
                                {f.aseguradora.nombre}
                                <span className="block text-xs text-slate-400">
                                  Seguro {usd(f.montoAseguradora)} · paciente {usd(f.montoPaciente)}
                                </span>
                              </>
                            ) : (
                              "Particular"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">{usd(f.total)}</td>
                          <td
                            className={clsx(
                              "px-4 py-3 text-right tabular-nums",
                              f.estado !== "ANULADA" && saldo > 0 ? "font-medium text-amber-700" : "text-slate-400"
                            )}
                          >
                            {f.estado === "ANULADA" ? "—" : usd(saldo)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge color={ESTADO_FACTURA[f.estado].color}>{ESTADO_FACTURA[f.estado].label}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <Button variant={cobrable ? "secondary" : "ghost"} onClick={() => setFacturaAbierta(f.id)}>
                              {cobrable ? "Cobrar" : "Ver"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <FacturaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(f) => {
          cargar();
          // Recién emitida, se abre para cobrar sin buscarla.
          setFacturaAbierta(f.id);
          setSeccion("facturas");
        }}
      />
      <FacturaDetalleModal facturaId={facturaAbierta} onClose={() => setFacturaAbierta(null)} onCambio={cargar} />
    </div>
  );
}

function Indicador({
  titulo,
  valor,
  detalle,
  onClick,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={clsx(
        "flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white p-4 text-left",
        onClick && "hover:border-lily-blue-300 hover:bg-lily-blue-50"
      )}
    >
      <span className="text-xs text-slate-500">{titulo}</span>
      <span className="text-xl font-semibold tabular-nums text-slate-900">{valor}</span>
      <span className="text-xs text-slate-500">{detalle}</span>
    </Comp>
  );
}
