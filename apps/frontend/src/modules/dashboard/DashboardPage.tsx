import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { DashboardData, obtenerDashboard } from "../../services/reportes";
import { getErrorMessage } from "../../services/api";
import { AlertasEquipos, obtenerAlertasEquipos } from "../../services/equipos";
import { Insumo, listarInsumosBajoStock } from "../../services/inventario";
import { alertaMantenimiento, estadoEquipoLabel } from "../inventario/equiposUi";
import { format } from "date-fns";

function AlertasInventario() {
  const [equipos, setEquipos] = useState<AlertasEquipos | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  useEffect(() => {
    obtenerAlertasEquipos().then(setEquipos).catch(() => setEquipos(null));
    listarInsumosBajoStock().then(setInsumos).catch(() => setInsumos([]));
  }, []);

  if (!equipos) return null;

  const items = [
    ...equipos.mantenimientoVencido.map((e) => ({
      id: `v-${e.id}`,
      texto: e.nombre,
      detalle: `Mantenimiento ${alertaMantenimiento(e.proximoMantenimiento).texto.toLowerCase()}`,
      color: "red" as const,
    })),
    ...equipos.fueraDeServicio.map((e) => ({
      id: `f-${e.id}`,
      texto: e.nombre,
      detalle: estadoEquipoLabel[e.estado],
      color: "red" as const,
    })),
    ...equipos.mantenimientoProximo.map((e) => ({
      id: `p-${e.id}`,
      texto: e.nombre,
      detalle: `Mantenimiento ${alertaMantenimiento(e.proximoMantenimiento, equipos.diasAviso).texto.toLowerCase()}`,
      color: "amber" as const,
    })),
    ...insumos.map((i) => ({
      id: `i-${i.id}`,
      texto: i.nombre,
      detalle: `Stock bajo: ${i.stockActual} ${i.unidadMedida ?? ""} (mínimo ${i.stockMinimo})`,
      color: "amber" as const,
    })),
  ];

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Alertas de equipos e insumos</h2>
        <Link to="/inventario" className="text-sm text-lily-blue-600 hover:underline">
          Ir a inventario
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium text-slate-900">{item.texto}</span>
              <Badge color={item.color}>{item.detalle}</Badge>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerDashboard()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Cargando dashboard...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Resumen del consultorio · {format(new Date(), "dd/MM/yyyy")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citas de hoy" value={data.citasHoy.length} />
        <StatCard label="Ingresos del mes" value={`$${data.ingresosDelMes}`} accent="text-lily-green-600" />
        <StatCard label="Pacientes activos" value={data.pacientesActivos} />
        <StatCard label="Pacientes nuevos (mes)" value={data.pacientesNuevosDelMes} accent="text-lily-blue-600" />
      </div>

      <AlertasInventario />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Citas de hoy</h2>
          <Link to="/agenda" className="text-sm text-lily-blue-600 hover:underline">
            Ver agenda completa
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {data.citasHoy.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No hay citas programadas para hoy.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.citasHoy.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {c.paciente.apellidos}, {c.paciente.nombres}
                    </p>
                    <p className="text-slate-500">
                      {format(new Date(c.fechaHoraInicio), "HH:mm")} · {c.profesional.nombre}{" "}
                      {c.profesional.apellido}
                    </p>
                  </div>
                  <Badge color="blue">{c.estado}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
