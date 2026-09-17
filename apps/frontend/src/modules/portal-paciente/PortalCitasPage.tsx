import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Cita, EstadoCita } from "../../types";
import { misCitas } from "../../services/portal";
import { getErrorMessage } from "../../services/api";

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

export function PortalCitasPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    misCitas()
      .then(setCitas)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const ahora = Date.now();
  const proximas = citas
    .filter((c) => new Date(c.fechaHoraInicio).getTime() >= ahora)
    .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());
  const pasadas = citas
    .filter((c) => new Date(c.fechaHoraInicio).getTime() < ahora)
    .sort((a, b) => new Date(b.fechaHoraInicio).getTime() - new Date(a.fechaHoraInicio).getTime());

  function listaCitas(lista: Cita[], vacio: string) {
    if (loading) return <p className="text-sm text-slate-500">Cargando...</p>;
    if (lista.length === 0) return <p className="text-sm text-slate-500">{vacio}</p>;
    return (
      <ul className="divide-y divide-slate-100">
        {lista.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">
                {format(new Date(c.fechaHoraInicio), "EEEE d 'de' MMMM yyyy, h:mm a", { locale: es })}
              </p>
              {c.profesional && (
                <p className="text-slate-500">
                  Con {c.profesional.nombre} {c.profesional.apellido}
                </p>
              )}
            </div>
            <Badge color={estadoColor[c.estado]}>{estadoLabel[c.estado]}</Badge>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Mis citas</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardBody>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Próximas</h2>
          {listaCitas(proximas, "No tienes citas próximas.")}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Historial</h2>
          {listaCitas(pasadas, "Aún no tienes citas pasadas.")}
        </CardBody>
      </Card>
    </div>
  );
}
