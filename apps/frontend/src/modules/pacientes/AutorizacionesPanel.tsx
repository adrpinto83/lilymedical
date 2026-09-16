import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { AutorizacionSeguro, EstadoAutorizacion, PacienteAseguradora } from "../../types";
import { listarAseguradorasPaciente } from "../../services/pacientes";
import {
  listarAutorizacionesPaciente,
  crearAutorizacion,
  actualizarAutorizacion,
  eliminarAutorizacion,
} from "../../services/autorizaciones";
import { getErrorMessage } from "../../services/api";
import { format } from "date-fns";

const estadoColor: Record<EstadoAutorizacion, "amber" | "green" | "red"> = {
  PENDIENTE: "amber",
  APROBADA: "green",
  RECHAZADA: "red",
};

export function AutorizacionesPanel({ pacienteId }: { pacienteId: string }) {
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionSeguro[]>([]);
  const [aseguradorasPaciente, setAseguradorasPaciente] = useState<PacienteAseguradora[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    aseguradoraId: "",
    numeroAutorizacion: "",
    sesionesAutorizadas: "",
    vigenciaHasta: "",
  });

  async function cargar() {
    try {
      const [autos, rel] = await Promise.all([
        listarAutorizacionesPaciente(pacienteId),
        listarAseguradorasPaciente(pacienteId),
      ]);
      setAutorizaciones(autos);
      setAseguradorasPaciente(rel);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function handleCrear(e: FormEvent) {
    e.preventDefault();
    if (!form.aseguradoraId) return;
    setGuardando(true);
    setError(null);
    try {
      await crearAutorizacion({
        pacienteId,
        aseguradoraId: form.aseguradoraId,
        numeroAutorizacion: form.numeroAutorizacion || undefined,
        sesionesAutorizadas: form.sesionesAutorizadas ? Number(form.sesionesAutorizadas) : undefined,
        vigenciaHasta: form.vigenciaHasta || undefined,
      });
      setForm({ aseguradoraId: "", numeroAutorizacion: "", sesionesAutorizadas: "", vigenciaHasta: "" });
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  async function handleEstado(id: string, estado: EstadoAutorizacion) {
    try {
      await actualizarAutorizacion(id, { estado });
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta autorización?")) return;
    try {
      await eliminarAutorizacion(id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Autorizaciones previas</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {autorizaciones.length === 0 ? (
          <p className="text-sm text-slate-500">Sin autorizaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {autorizaciones.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {a.aseguradora?.nombre} <Badge color={estadoColor[a.estado]}>{a.estado}</Badge>
                  </p>
                  <p className="text-slate-500">
                    {a.numeroAutorizacion ? `N° ${a.numeroAutorizacion}` : "Sin número asignado"}
                    {a.sesionesAutorizadas ? ` · ${a.sesionesAutorizadas} sesión(es)` : ""}
                    {a.vigenciaHasta ? ` · vigente hasta ${format(new Date(a.vigenciaHasta), "dd/MM/yyyy")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {a.estado !== "APROBADA" && (
                    <Button variant="ghost" onClick={() => handleEstado(a.id, "APROBADA")}>
                      Aprobar
                    </Button>
                  )}
                  {a.estado !== "RECHAZADA" && (
                    <Button variant="ghost" onClick={() => handleEstado(a.id, "RECHAZADA")}>
                      Rechazar
                    </Button>
                  )}
                  <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleEliminar(a.id)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {aseguradorasPaciente.length > 0 && (
          <form onSubmit={handleCrear} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <Select
              label="Aseguradora"
              value={form.aseguradoraId}
              onChange={(e) => setForm((f) => ({ ...f, aseguradoraId: e.target.value }))}
              className="min-w-[180px]"
            >
              <option value="">Seleccionar...</option>
              {aseguradorasPaciente.map((r) => (
                <option key={r.aseguradoraId} value={r.aseguradoraId}>
                  {r.aseguradora?.nombre}
                </option>
              ))}
            </Select>
            <Input
              label="N° de autorización"
              value={form.numeroAutorizacion}
              onChange={(e) => setForm((f) => ({ ...f, numeroAutorizacion: e.target.value }))}
            />
            <Input
              label="Sesiones autorizadas"
              type="number"
              min={1}
              value={form.sesionesAutorizadas}
              onChange={(e) => setForm((f) => ({ ...f, sesionesAutorizadas: e.target.value }))}
            />
            <Input
              label="Vigente hasta"
              type="date"
              value={form.vigenciaHasta}
              onChange={(e) => setForm((f) => ({ ...f, vigenciaHasta: e.target.value }))}
            />
            <Button type="submit" disabled={guardando || !form.aseguradoraId}>
              Registrar
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
