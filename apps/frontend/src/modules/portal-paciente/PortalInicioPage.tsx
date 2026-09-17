import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { Cita } from "../../types";
import { obtenerMiResumenClinico, misCitas, ResumenClinico } from "../../services/portal";
import { getErrorMessage } from "../../services/api";

export function PortalInicioPage() {
  const { user } = useAuth();
  const [resumen, setResumen] = useState<ResumenClinico | null>(null);
  const [proximaCita, setProximaCita] = useState<Cita | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([obtenerMiResumenClinico(), misCitas()])
      .then(([r, citas]) => {
        setResumen(r);
        const ahora = Date.now();
        const proximas = citas
          .filter((c) => new Date(c.fechaHoraInicio).getTime() >= ahora && c.estado !== "CANCELADA")
          .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());
        setProximaCita(proximas[0] ?? null);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Hola, {user?.nombre}</h1>
        <p className="text-sm text-slate-500">Este es tu resumen en LilyMedical.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {resumen?.alergias && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>⚠ Alergias registradas:</strong> {resumen.alergias}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Próxima cita</h2>
        </CardHeader>
        <CardBody>
          {proximaCita ? (
            <div className="text-sm">
              <p className="font-medium text-slate-900">
                {format(new Date(proximaCita.fechaHoraInicio), "EEEE d 'de' MMMM, h:mm a", { locale: es })}
              </p>
              {proximaCita.profesional && (
                <p className="text-slate-500">
                  Con {proximaCita.profesional.nombre} {proximaCita.profesional.apellido}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No tienes citas próximas agendadas.</p>
          )}
          <Link to="/portal/citas" className="mt-3 inline-block text-sm font-medium text-lily-blue-600 hover:underline">
            Ver todas mis citas →
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Diagnóstico registrado</h2>
        </CardHeader>
        <CardBody>
          {resumen?.diagnosticoPrincipal ? (
            <p className="text-sm text-slate-800">
              {resumen.diagnosticoPrincipal}
              {resumen.codigoCIE10 && <span className="text-slate-500"> ({resumen.codigoCIE10})</span>}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Aún no hay un diagnóstico registrado.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
