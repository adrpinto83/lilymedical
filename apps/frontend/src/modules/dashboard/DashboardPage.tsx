import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { DashboardData, obtenerDashboard } from "../../services/reportes";
import { getErrorMessage } from "../../services/api";
import { AlertasEquipos, obtenerAlertasEquipos } from "../../services/equipos";
import { Insumo, listarInsumosBajoStock } from "../../services/inventario";
import { useAuth } from "../../context/AuthContext";
import { EstadoCita } from "../../types";
import { alertaMantenimiento, estadoEquipoLabel, fechaCorta } from "../inventario/equiposUi";
import { IngresosChart } from "./IngresosChart";
import { formatoMonto, variacion } from "./formato";

type Cita = DashboardData["citasHoy"][number];

const estadoLabel: Record<EstadoCita, string> = {
  PROGRAMADA: "Programada",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  NO_ASISTIO: "No asistió",
};

const estadoColor: Record<EstadoCita, "blue" | "green" | "slate" | "red" | "amber"> = {
  PROGRAMADA: "blue",
  CONFIRMADA: "green",
  ATENDIDA: "slate",
  CANCELADA: "red",
  NO_ASISTIO: "amber",
};

const COMPARACION = "vs. mismo período del mes anterior";

function saludo(hora: number): string {
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

function Delta({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-slate-500">Mes anterior sin registros para comparar</span>;
  if (valor === 0) return <span className="text-slate-500">= Igual {COMPARACION}</span>;
  const sube = valor > 0;
  return (
    <span className={sube ? "text-lily-green-700" : "text-red-600"}>
      <span aria-hidden="true">{sube ? "▲" : "▼"}</span> {sube ? "+" : ""}
      {valor}% <span className="text-slate-500">{COMPARACION}</span>
    </span>
  );
}

function StatTile({ label, value, detalle }: { label: string; value: ReactNode; detalle?: ReactNode }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {detalle && <p className="mt-1 text-xs">{detalle}</p>}
      </CardBody>
    </Card>
  );
}

function pendienteDeCierre(c: Cita, ahora: Date): boolean {
  return (c.estado === "PROGRAMADA" || c.estado === "CONFIRMADA") && new Date(c.fechaHoraFin) < ahora;
}

function AgendaHoy({ citas, citasManana }: { citas: Cita[]; citasManana: number }) {
  const ahora = new Date();
  const proxima = citas.find(
    (c) => (c.estado === "PROGRAMADA" || c.estado === "CONFIRMADA") && new Date(c.fechaHoraFin) >= ahora
  );
  const atendidas = citas.filter((c) => c.estado === "ATENDIDA").length;
  const porAtender = citas.filter(
    (c) => (c.estado === "PROGRAMADA" || c.estado === "CONFIRMADA") && !pendienteDeCierre(c, ahora)
  ).length;
  const sinCerrar = citas.filter((c) => pendienteDeCierre(c, ahora)).length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Agenda de hoy</h2>
          {citas.length > 0 && (
            <p className="text-xs text-slate-500">
              {atendidas} atendidas · {porAtender} por atender
              {sinCerrar > 0 && ` · ${sinCerrar} sin marcar asistencia`}
            </p>
          )}
        </div>
        <Link to="/agenda" className="text-sm text-lily-blue-600 hover:underline">
          Ver agenda completa
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        {citas.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No hay citas para hoy.
            {citasManana > 0 && ` Mañana hay ${citasManana} ${citasManana === 1 ? "cita" : "citas"} programadas.`}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {citas.map((c) => {
              const esProxima = c.id === proxima?.id;
              const cerrada = c.estado === "ATENDIDA" || c.estado === "CANCELADA" || c.estado === "NO_ASISTIO";
              return (
                <li
                  key={c.id}
                  className={clsx(
                    "flex items-center gap-4 px-4 py-3 text-sm",
                    esProxima && "bg-lily-blue-50",
                    cerrada && "text-slate-500"
                  )}
                >
                  <div className="w-16 shrink-0 tabular-nums sm:w-24">
                    <p className="font-medium text-slate-900">{format(new Date(c.fechaHoraInicio), "HH:mm")}</p>
                    <p className="text-xs text-slate-500">hasta {format(new Date(c.fechaHoraFin), "HH:mm")}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/pacientes/${c.paciente.id}`}
                      className="font-medium text-slate-900 hover:text-lily-blue-700 hover:underline"
                    >
                      {c.paciente.apellidos}, {c.paciente.nombres}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {[
                        c.tarifa?.nombreServicio,
                        c.totalSesionesGrupo && `Sesión ${c.numeroSesionEnGrupo} de ${c.totalSesionesGrupo}`,
                        `${c.profesional.nombre} ${c.profesional.apellido}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {pendienteDeCierre(c, ahora) && (
                      <p className="text-xs text-amber-700">Terminó — falta marcar si asistió</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {esProxima && <span className="text-xs font-medium text-lily-blue-700">Próxima</span>}
                    <Badge color={estadoColor[c.estado]}>{estadoLabel[c.estado]}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function Pendientes({ data }: { data: DashboardData }) {
  const { atendidas, inasistencias } = data.asistenciaDelMes;
  const cerradas = atendidas + inasistencias;
  const asistencia = cerradas > 0 ? Math.round((atendidas / cerradas) * 100) : null;
  const { pendientes, porVencer } = data.autorizaciones;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Seguimiento</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-4 text-sm">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-slate-600">Asistencia del mes</span>
            <span className="font-semibold text-slate-900">{asistencia === null ? "—" : `${asistencia}%`}</span>
          </div>
          {asistencia !== null && (
            <>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-lily-green-100"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={asistencia}
                aria-label="Asistencia del mes"
              >
                <div className="h-full rounded-full bg-lily-green-500" style={{ width: `${asistencia}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {atendidas} atendidas · {inasistencias} {inasistencias === 1 ? "inasistencia" : "inasistencias"}
              </p>
            </>
          )}
        </div>

        <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
          <span className="text-slate-600">Autorizaciones de seguro pendientes</span>
          <span className={clsx("font-semibold", pendientes > 0 ? "text-amber-700" : "text-slate-900")}>
            {pendientes}
          </span>
        </div>

        {porVencer.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-slate-600">Autorizaciones que vencen esta semana</p>
            <ul className="flex flex-col gap-2">
              {porVencer.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <Link to={`/pacientes/${a.paciente.id}`} className="min-w-0 truncate hover:underline">
                    {a.paciente.apellidos}, {a.paciente.nombres}
                    <span className="block text-xs text-slate-500">{a.aseguradora.nombre}</span>
                  </Link>
                  <Badge color="amber">Vence {fechaCorta(a.vigenciaHasta)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Cumpleanos({ pacientes }: { pacientes: DashboardData["cumpleanos"] }) {
  if (pacientes.length === 0) return null;
  const anioActual = new Date().getFullYear();
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">
          <span aria-hidden="true">🎂</span> Cumpleaños de hoy
        </h2>
      </CardHeader>
      <CardBody className="p-0">
        <ul className="divide-y divide-slate-100 text-sm">
          {pacientes.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2">
              <Link to={`/pacientes/${p.id}`} className="hover:underline">
                {p.nombres} {p.apellidos}
              </Link>
              <span className="text-xs text-slate-500">
                {anioActual - Number(p.fechaNacimiento.slice(0, 4))} años
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function AlertasInventario() {
  const [equipos, setEquipos] = useState<AlertasEquipos | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  useEffect(() => {
    obtenerAlertasEquipos().then(setEquipos).catch(() => setEquipos(null));
    listarInsumosBajoStock().then(setInsumos).catch(() => setInsumos([]));
  }, []);

  if (!equipos) return null;

  const avisoCorto = (proximo: string | null, dias?: number) =>
    alertaMantenimiento(proximo, dias).texto.replace("En ", "Vence en ");
  const items = [
    ...equipos.mantenimientoVencido.map((e) => ({
      id: `v-${e.id}`,
      texto: e.nombre,
      tipo: "Mantenimiento preventivo",
      detalle: avisoCorto(e.proximoMantenimiento),
      color: "red" as const,
    })),
    ...equipos.fueraDeServicio.map((e) => ({
      id: `f-${e.id}`,
      texto: e.nombre,
      tipo: "Equipo",
      detalle: estadoEquipoLabel[e.estado],
      color: "red" as const,
    })),
    ...equipos.mantenimientoProximo.map((e) => ({
      id: `p-${e.id}`,
      texto: e.nombre,
      tipo: "Mantenimiento preventivo",
      detalle: avisoCorto(e.proximoMantenimiento, equipos.diasAviso),
      color: "amber" as const,
    })),
    ...insumos.map((i) => ({
      id: `i-${i.id}`,
      texto: i.nombre,
      tipo: `Insumo · mínimo ${i.stockMinimo}`,
      detalle: `Quedan ${i.stockActual}`,
      color: "amber" as const,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Equipos e insumos</h2>
        <Link to="/inventario" className="text-sm text-lily-blue-600 hover:underline">
          Ir a inventario
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{item.texto}</p>
                <p className="text-xs text-slate-500">{item.tipo}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap">
                <Badge color={item.color}>{item.detalle}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerDashboard()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Cargando dashboard...</p>;

  const hoy = new Date();
  const citasActivasHoy = data.citasHoy.filter((c) => c.estado !== "CANCELADA").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {saludo(hoy.getHours())}
          {user ? `, ${user.nombre}` : ""}
        </h1>
        <p className="text-sm first-letter:uppercase text-slate-500">
          {format(hoy, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Citas de hoy"
          value={citasActivasHoy}
          detalle={<span className="text-slate-500">Mañana: {data.citasManana}</span>}
        />
        <StatTile
          label="Ingresos del mes"
          value={formatoMonto(data.ingresosDelMes)}
          detalle={<Delta valor={variacion(Number(data.ingresosDelMes), Number(data.ingresosPeriodoAnterior))} />}
        />
        <StatTile
          label="Pacientes nuevos del mes"
          value={data.pacientesNuevosDelMes}
          detalle={
            <>
              <Delta valor={variacion(data.pacientesNuevosDelMes, data.pacientesNuevosPeriodoAnterior)} />
              <span className="block text-slate-500">{data.pacientesActivos} pacientes activos en total</span>
            </>
          }
        />
        <StatTile
          label="Por cobrar"
          value={formatoMonto(data.porCobrar.saldo)}
          detalle={
            <Link to="/facturacion" className="text-lily-blue-600 hover:underline">
              {data.porCobrar.facturas} {data.porCobrar.facturas === 1 ? "factura pendiente" : "facturas pendientes"}
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AgendaHoy citas={data.citasHoy} citasManana={data.citasManana} />
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Ingresos cobrados · últimos 6 meses</h2>
              <Link to="/reportes" className="text-sm text-lily-blue-600 hover:underline">
                Ver reportes
              </Link>
            </CardHeader>
            <CardBody>
              <IngresosChart datos={data.ingresosPorMes} />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Pendientes data={data} />
          <AlertasInventario />
          <Cumpleanos pacientes={data.cumpleanos} />
        </div>
      </div>
    </div>
  );
}
