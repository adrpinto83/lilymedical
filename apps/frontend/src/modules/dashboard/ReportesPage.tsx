import { useCallback, useEffect, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import {
  ResumenReporte,
  obtenerResumen,
  descargarIngresosCsv,
  descargarCobrosAseguradoraCsv,
  descargarCuentasPorCobrarCsv,
} from "../../services/reportes";
import { getErrorMessage } from "../../services/api";
import { EstadoCita, MetodoPago } from "../../types";
import { METODO_PAGO, bs } from "../facturacion/facturacionUtils";
import { formatoMonto, variacion } from "./formato";
import { BarrasHorizontales, BarrasTiempo } from "./reportes/Graficos";

type Periodo = "mes" | "mesAnterior" | "30" | "trimestre" | "anio" | "anioAnterior" | "personalizado";

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "mesAnterior", etiqueta: "Mes anterior" },
  { valor: "30", etiqueta: "Últimos 30 días" },
  { valor: "trimestre", etiqueta: "Este trimestre" },
  { valor: "anio", etiqueta: "Este año" },
  { valor: "anioAnterior", etiqueta: "Año anterior" },
  { valor: "personalizado", etiqueta: "Personalizado" },
];

function rango(periodo: Periodo, desde: string, hasta: string): [Date, Date] {
  const hoy = new Date();
  switch (periodo) {
    case "mes":
      return [startOfMonth(hoy), endOfDay(hoy)];
    case "mesAnterior":
      return [startOfMonth(subMonths(hoy, 1)), endOfMonth(subMonths(hoy, 1))];
    case "30":
      return [startOfDay(subDays(hoy, 29)), endOfDay(hoy)];
    case "trimestre":
      return [startOfQuarter(hoy), endOfDay(hoy)];
    case "anio":
      return [startOfYear(hoy), endOfDay(hoy)];
    case "anioAnterior": {
      const a = new Date(hoy.getFullYear() - 1, 0, 1);
      return [a, endOfYear(a)];
    }
    case "personalizado":
      return [new Date(`${desde}T00:00:00`), new Date(`${hasta}T23:59:59.999`)];
  }
}

const ESTADO_CITA: Record<EstadoCita, string> = {
  ATENDIDA: "Atendidas",
  NO_ASISTIO: "No asistieron",
  CANCELADA: "Canceladas",
  CONFIRMADA: "Confirmadas (por atender)",
  PROGRAMADA: "Programadas (por atender)",
};

export function ReportesPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [datos, setDatos] = useState<ResumenReporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  const [inicio, fin] = rango(periodo, desde, hasta);
  const rangoValido = !isNaN(inicio.getTime()) && !isNaN(fin.getTime()) && fin >= inicio;

  const cargar = useCallback(async () => {
    if (!rangoValido) return;
    setCargando(true);
    setError(null);
    try {
      setDatos(await obtenerResumen(inicio, fin));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function exportar(tipo: "ingresos" | "aseguradoras" | "porCobrar") {
    setExportando(tipo);
    setError(null);
    try {
      if (tipo === "ingresos") await descargarIngresosCsv(inicio, fin);
      else if (tipo === "aseguradoras") await descargarCobrosAseguradoraCsv(inicio, fin);
      else await descargarCuentasPorCobrarCsv();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExportando(null);
    }
  }

  const titulo = `${format(inicio, "d MMM yyyy", { locale: es })} – ${format(fin, "d MMM yyyy", { locale: es })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500">{rangoValido ? titulo : "Rango de fechas inválido"}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 print:hidden">
          <Select aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="w-44">
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </Select>
          {periodo === "personalizado" && (
            <>
              <Input aria-label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              <Input aria-label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {cargando && !datos && <p className="text-sm text-slate-500">Cargando reporte...</p>}

      {datos && (
        <div className={clsx("flex flex-col gap-6 transition-opacity", cargando && "opacity-60")}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Cobrado" valor={formatoMonto(datos.actual.cobrado)} actual={+datos.actual.cobrado} anterior={+datos.anterior.cobrado} />
            <Kpi titulo="Facturado" valor={formatoMonto(datos.actual.facturado)} actual={+datos.actual.facturado} anterior={+datos.anterior.facturado} />
            <Kpi
              titulo="Citas atendidas"
              valor={String(datos.actual.citasAtendidas)}
              actual={datos.actual.citasAtendidas}
              anterior={datos.anterior.citasAtendidas}
            />
            <Kpi
              titulo="Pacientes nuevos"
              valor={String(datos.actual.pacientesNuevos)}
              actual={datos.actual.pacientesNuevos}
              anterior={datos.anterior.pacientesNuevos}
            />
          </div>

          {/* ----------------------------------------------------- Finanzas */}
          <Seccion titulo="Ingresos">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cobros por {datos.finanzas.serie.granularidad === "dia" ? "día" : "mes"}
                  </h3>
                </CardHeader>
                <CardBody>
                  <BarrasTiempo {...datos.finanzas.serie} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Por método de pago</h3>
                </CardHeader>
                <CardBody>
                  <BarrasHorizontales
                    vacio="No hubo cobros en este período."
                    filas={datos.finanzas.porMetodo.map((m) => ({
                      etiqueta: METODO_PAGO[m.metodo as MetodoPago]?.label ?? m.metodo,
                      valor: Number(m.total),
                      texto: formatoMonto(m.total),
                      detalle: `${m.cantidad} pago(s)${Number(m.totalBs) > 0 ? ` · ${bs(m.totalBs)}` : ""}`,
                    }))}
                  />
                  {Number(datos.finanzas.recibidoEnBs) > 0 && (
                    <p className="mt-3 text-xs text-slate-500">
                      Recibido en bolívares: <strong>{bs(datos.finanzas.recibidoEnBs)}</strong>
                    </p>
                  )}
                </CardBody>
              </Card>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Dato titulo="Facturas emitidas" valor={String(datos.finanzas.facturas)} />
              <Dato titulo="Ticket promedio" valor={formatoMonto(datos.finanzas.ticketPromedio)} />
              <Dato titulo="Facturado a particulares" valor={formatoMonto(datos.finanzas.facturadoParticular)} />
              <Dato titulo="Facturado a aseguradoras" valor={formatoMonto(datos.finanzas.facturadoAseguradoras)} />
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="secondary" disabled={!!exportando} onClick={() => exportar("ingresos")}>
                {exportando === "ingresos" ? "Exportando..." : "Exportar cobros (Excel)"}
              </Button>
              <Button variant="secondary" disabled={!!exportando} onClick={() => exportar("aseguradoras")}>
                {exportando === "aseguradoras" ? "Exportando..." : "Exportar facturas a aseguradoras (Excel)"}
              </Button>
            </div>
          </Seccion>

          {/* ----------------------------------------------- Por cobrar (a hoy) */}
          <Seccion titulo="Cuentas por cobrar" nota="A la fecha de hoy, sin importar el período elegido">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card>
                <CardBody className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500">Total por cobrar</p>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{formatoMonto(datos.porCobrar.total)}</p>
                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    <span className="flex justify-between">
                      <span>A pacientes</span>
                      <span className="tabular-nums">{formatoMonto(datos.porCobrar.pacientes)}</span>
                    </span>
                    <span className="flex justify-between">
                      <span>A aseguradoras</span>
                      <span className="tabular-nums">{formatoMonto(datos.porCobrar.aseguradoras)}</span>
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    className="mt-2 print:hidden"
                    disabled={!!exportando}
                    onClick={() => exportar("porCobrar")}
                  >
                    {exportando === "porCobrar" ? "Exportando..." : "Exportar detalle (Excel)"}
                  </Button>
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Antigüedad del saldo</h3>
                </CardHeader>
                <CardBody>
                  <BarrasHorizontales
                    vacio="No hay saldos pendientes."
                    filas={datos.porCobrar.antiguedad.map((t) => ({
                      etiqueta: t.etiqueta,
                      valor: Number(t.saldo),
                      texto: formatoMonto(t.saldo),
                      detalle: `${t.facturas} fact.`,
                    }))}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Pendiente por aseguradora</h3>
                </CardHeader>
                <CardBody>
                  <BarrasHorizontales
                    vacio="Ninguna aseguradora tiene saldo pendiente."
                    filas={datos.porCobrar.porAseguradora.map((a) => ({
                      etiqueta: a.nombre,
                      valor: Number(a.saldo),
                      texto: formatoMonto(a.saldo),
                      detalle: `${a.facturas} fact.`,
                    }))}
                  />
                </CardBody>
              </Card>
            </div>
          </Seccion>

          {/* -------------------------------------------------------- Agenda */}
          <Seccion titulo="Agenda y pacientes">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Dato titulo="Citas en el período" valor={String(datos.agenda.total)} />
              <Dato
                titulo="Asistencia"
                valor={datos.agenda.tasaAsistencia === null ? "—" : `${datos.agenda.tasaAsistencia}%`}
                detalle="Atendidas sobre atendidas + inasistencias"
              />
              <Dato titulo="Pacientes atendidos" valor={String(datos.agenda.pacientesAtendidos)} detalle="Personas distintas" />
              <Dato titulo="Pacientes nuevos" valor={String(datos.actual.pacientesNuevos)} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Citas por estado</h3>
                </CardHeader>
                <CardBody>
                  <BarrasHorizontales
                    vacio="No hubo citas en este período."
                    filas={(Object.keys(ESTADO_CITA) as EstadoCita[]).map((e) => ({
                      etiqueta: ESTADO_CITA[e],
                      valor: datos.agenda.estados[e],
                      texto: String(datos.agenda.estados[e]),
                      detalle: datos.agenda.total ? `${Math.round((datos.agenda.estados[e] / datos.agenda.total) * 100)}%` : undefined,
                    }))}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Por profesional</h3>
                </CardHeader>
                <CardBody className="overflow-x-auto p-0">
                  {datos.agenda.porProfesional.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No hubo citas en este período.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Profesional</th>
                          <th className="px-4 py-2 text-right">Atendidas</th>
                          <th className="px-4 py-2 text-right">No asistió</th>
                          <th className="px-4 py-2 text-right">Canceladas</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 tabular-nums">
                        {datos.agenda.porProfesional.map((p) => (
                          <tr key={p.nombre}>
                            <td className="px-4 py-2 text-slate-800">{p.nombre}</td>
                            <td className="px-4 py-2 text-right font-medium text-slate-900">{p.atendidas}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{p.noAsistio}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{p.canceladas}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{p.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </div>
          </Seccion>

          {/* ----------------------------------------------------- Servicios */}
          <Seccion titulo="Servicios facturados">
            <Card>
              <CardBody>
                <BarrasHorizontales
                  vacio="No se facturaron servicios en este período."
                  filas={datos.servicios.map((s) => ({
                    etiqueta: s.servicio,
                    valor: s.cantidad,
                    texto: `${s.cantidad}`,
                    detalle: formatoMonto(s.total),
                  }))}
                />
              </CardBody>
            </Card>
          </Seccion>

          {/* ------------------------------------------- Fisiatría (médico) */}
          {datos.clinico && (
            <Seccion titulo="Resultados de terapia" nota="Datos agregados de las notas de sesión; sin identificar pacientes">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Dato titulo="Sesiones realizadas" valor={String(datos.clinico.sesiones)} />
                <Dato
                  titulo="Dolor promedio (EVA)"
                  valor={
                    datos.clinico.evaPrePromedio === null
                      ? "—"
                      : `${datos.clinico.evaPrePromedio.toFixed(1)} → ${datos.clinico.evaPostPromedio!.toFixed(1)}`
                  }
                  detalle="Al llegar → al salir"
                />
                <Dato
                  titulo="Sesiones con alivio"
                  valor={
                    datos.clinico.sesionesConEva
                      ? `${Math.round((datos.clinico.sesionesConAlivio / datos.clinico.sesionesConEva) * 100)}%`
                      : "—"
                  }
                  detalle={`De ${datos.clinico.sesionesConEva} con EVA registrada`}
                />
                <Dato
                  titulo="Alivio promedio"
                  valor={
                    datos.clinico.evaPrePromedio === null
                      ? "—"
                      : `${(datos.clinico.evaPrePromedio - datos.clinico.evaPostPromedio!).toFixed(1)} puntos`
                  }
                />
              </div>
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-slate-900">Modalidades más aplicadas</h3>
                </CardHeader>
                <CardBody>
                  <BarrasHorizontales
                    vacio="No se registraron modalidades en las sesiones del período."
                    filas={datos.clinico.modalidades.map((m) => ({
                      etiqueta: m.nombre,
                      valor: m.veces,
                      texto: `${m.veces}`,
                      detalle: "sesiones",
                    }))}
                  />
                </CardBody>
              </Card>
            </Seccion>
          )}
        </div>
      )}
    </div>
  );
}

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 break-inside-avoid">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        {nota && <span className="text-xs text-slate-500">{nota}</span>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ titulo, valor, actual, anterior }: { titulo: string; valor: string; actual: number; anterior: number }) {
  const v = variacion(actual, anterior);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="text-2xl font-semibold tabular-nums text-slate-900">{valor}</p>
      <p className="text-xs text-slate-500">
        {v === null ? (
          "Sin datos del período anterior"
        ) : (
          <>
            <span className={clsx("font-medium", v > 0 ? "text-lily-green-700" : v < 0 ? "text-red-600" : "text-slate-600")}>
              {v > 0 ? "▲" : v < 0 ? "▼" : "="} {Math.abs(v)}%
            </span>{" "}
            vs. período anterior
          </>
        )}
      </p>
    </div>
  );
}

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="text-lg font-semibold tabular-nums text-slate-900">{valor}</p>
      {detalle && <p className="text-[11px] text-slate-400">{detalle}</p>}
    </div>
  );
}
