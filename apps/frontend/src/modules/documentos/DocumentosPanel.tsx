import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Receta, ConstanciaMedica, PlanEjercicios, InformeMedico } from "../../types";
import { listarRecetasPorPaciente, abrirPdfReceta } from "../../services/recetas";
import { listarConstanciasPorPaciente, abrirPdfConstancia } from "../../services/constancias";
import { listarPlanesPorPaciente, abrirPdfPlanEjercicios } from "../../services/planesEjercicios";
import {
  listarInformesPorPaciente,
  abrirPdfInformeMedico,
  cambiarFechaInformeMedico,
} from "../../services/informesMedicos";
import {
  listarInformesConsulta,
  cambiarFechaInformeConsulta,
  abrirPdfInformeConsulta,
  InformeConsulta,
} from "../../services/historiasClinicas";
import { getErrorMessage } from "../../services/api";
import { enviarDocumentoPorCorreo, TipoDocumentoCorreo } from "../../services/correos";
import { RecetaFormModal } from "./RecetaFormModal";
import { ConstanciaFormModal } from "./ConstanciaFormModal";
import { InformeMedicoFormModal } from "./InformeMedicoFormModal";
import { PlanEjerciciosFormModal } from "./PlanEjerciciosFormModal";
import { ExportarHistoriaModal } from "./ExportarHistoriaModal";
import { format } from "date-fns";

export function DocumentosPanel({ pacienteId }: { pacienteId: string }) {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [constancias, setConstancias] = useState<ConstanciaMedica[]>([]);
  const [planes, setPlanes] = useState<PlanEjercicios[]>([]);
  const [informes, setInformes] = useState<InformeMedico[]>([]);
  const [informeModalOpen, setInformeModalOpen] = useState(false);
  const [informesConsulta, setInformesConsulta] = useState<InformeConsulta[]>([]);
  // Informe al que se le está cambiando la fecha y la fecha nueva (AAAA-MM-DD).
  // id: el del informe médico, o "consulta-<día>" para un informe de consulta.
  const [fechaEditando, setFechaEditando] = useState<{ id: string; fecha: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recetaModalOpen, setRecetaModalOpen] = useState(false);
  const [constanciaModalOpen, setConstanciaModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [exportarModalOpen, setExportarModalOpen] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviarPorCorreo(tipo: TipoDocumentoCorreo, id: string, nombre: string) {
    if (!confirm(`¿Enviar ${nombre} en PDF al correo del paciente?`)) return;
    setError(null);
    setAviso(null);
    setEnviandoId(id);
    try {
      const email = await enviarDocumentoPorCorreo(tipo, id);
      setAviso(`Se envió ${nombre} a ${email}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnviandoId(null);
    }
  }

  function botonCorreo(tipo: TipoDocumentoCorreo, id: string, nombre: string) {
    return (
      <Button variant="ghost" disabled={enviandoId === id} onClick={() => enviarPorCorreo(tipo, id, nombre)}>
        {enviandoId === id ? "Enviando..." : "✉️ Enviar por correo"}
      </Button>
    );
  }

  async function guardarFechaInforme() {
    if (!fechaEditando) return;
    setError(null);
    try {
      const dia = fechaEditando.id.startsWith("consulta-") ? fechaEditando.id.slice("consulta-".length) : null;
      if (dia) {
        // Volver al día de la consulta quita la fecha puesta.
        await cambiarFechaInformeConsulta(pacienteId, dia, fechaEditando.fecha === dia ? null : fechaEditando.fecha);
      } else {
        await cambiarFechaInformeMedico(fechaEditando.id, fechaEditando.fecha);
      }
      setFechaEditando(null);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // "Cambiar fecha" y "Ver PDF" de un informe, o el selector de fecha si se está cambiando.
  function accionesInforme(id: string, fechaActual: string, verPdf: () => void) {
    if (fechaEditando?.id === id) {
      return (
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="date"
            aria-label="Nueva fecha del informe"
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            value={fechaEditando.fecha}
            onChange={(e) => setFechaEditando({ id, fecha: e.target.value })}
          />
          <Button disabled={!fechaEditando.fecha} onClick={guardarFechaInforme}>
            Guardar
          </Button>
          <Button variant="ghost" onClick={() => setFechaEditando(null)}>
            Cancelar
          </Button>
        </div>
      );
    }
    return (
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" onClick={() => setFechaEditando({ id, fecha: fechaActual })}>
          📅 Cambiar fecha
        </Button>
        <Button variant="ghost" onClick={verPdf}>
          Ver PDF
        </Button>
      </div>
    );
  }

  const cargar = useCallback(async () => {
    try {
      const [r, c, p, i, ic] = await Promise.all([
        listarRecetasPorPaciente(pacienteId),
        listarConstanciasPorPaciente(pacienteId),
        listarPlanesPorPaciente(pacienteId),
        listarInformesPorPaciente(pacienteId),
        listarInformesConsulta(pacienteId),
      ]);
      setRecetas(r);
      setConstancias(c);
      setPlanes(p);
      setInformes(i);
      setInformesConsulta(ic);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [pacienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setRecetaModalOpen(true)}>+ Nueva receta</Button>
          <Button variant="secondary" onClick={() => setInformeModalOpen(true)}>
            + Nuevo informe médico
          </Button>
          <Button variant="secondary" onClick={() => setConstanciaModalOpen(true)}>
            + Nueva constancia
          </Button>
          <Button variant="secondary" onClick={() => setPlanModalOpen(true)}>
            + Nuevo plan de ejercicios
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setExportarModalOpen(true)}>
          🖨 Imprimir / exportar historia clínica
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {aviso && <p className="text-sm text-green-700">{aviso}</p>}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Recetas emitidas</h2>
        </CardHeader>
        <CardBody className="p-0">
          {recetas.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no se han emitido recetas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recetas.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.numeroReceta}{" "}
                      <Badge color={r.tipo === "MEDICAMENTO" ? "blue" : "green"}>
                        {r.tipo === "MEDICAMENTO" ? "Medicamentos" : "Orden de terapia"}
                      </Badge>
                    </p>
                    <p className="text-slate-500">
                      {format(new Date(r.fecha), "dd/MM/yyyy")} · {r.items.length} ítem(s)
                      {r.diagnostico ? ` · ${r.diagnostico}` : ""}
                      {r.fechaVencimiento ? ` · válida hasta ${format(new Date(r.fechaVencimiento), "dd/MM/yyyy")}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {botonCorreo("recetas", r.id, `la receta ${r.numeroReceta}`)}
                    <Button variant="ghost" onClick={() => abrirPdfReceta(r.id)}>
                      Ver PDF
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Informes médicos</h2>
        </CardHeader>
        <CardBody className="p-0">
          {informes.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no se han emitido informes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {informes.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {i.numeroInforme} <span className="font-normal text-slate-500">· {format(new Date(i.fecha), "dd/MM/yyyy")}</span>
                    </p>
                    <p className="truncate text-slate-500">{i.informe}</p>
                  </div>
                  {accionesInforme(i.id, format(new Date(i.fecha), "yyyy-MM-dd"), () => abrirPdfInformeMedico(i.id))}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Informes de consulta</h2>
          <p className="text-xs text-slate-500">
            Uno por cada día con consulta en la historia. Cambiar la fecha solo afecta al informe impreso; la historia
            conserva la fecha de la consulta.
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {informesConsulta.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no hay consultas registradas en la historia.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {informesConsulta.map((ic) => {
                const fechaInforme = ic.fechaInforme ? format(new Date(ic.fechaInforme), "yyyy-MM-dd") : ic.dia;
                const detalle = [
                  ic.evaluaciones > 0 && `${ic.evaluaciones} evaluación(es)`,
                  ic.sesiones > 0 && `${ic.sesiones} sesión(es)`,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={ic.dia} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        Informe del {format(new Date(fechaInforme + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                      <p className="text-slate-500">
                        {ic.fechaInforme
                          ? `Consulta del ${format(new Date(ic.dia + "T12:00:00"), "dd/MM/yyyy")} · `
                          : ""}
                        {detalle}
                      </p>
                    </div>
                    {accionesInforme(`consulta-${ic.dia}`, fechaInforme, () =>
                      abrirPdfInformeConsulta(pacienteId, ic.referencia).catch((err) => setError(getErrorMessage(err)))
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Constancias médicas</h2>
        </CardHeader>
        <CardBody className="p-0">
          {constancias.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no se han emitido constancias.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {constancias.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{c.numeroConstancia}</p>
                    <p className="text-slate-500">
                      {format(new Date(c.fecha), "dd/MM/yyyy")}
                      {c.diasReposo ? ` · ${c.diasReposo} día(s) de reposo` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {botonCorreo("constancias", c.id, `la constancia ${c.numeroConstancia}`)}
                    <Button variant="ghost" onClick={() => abrirPdfConstancia(c.id)}>
                      Ver PDF
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Planes de ejercicios</h2>
        </CardHeader>
        <CardBody className="p-0">
          {planes.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no se han creado planes de ejercicios.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {planes.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {format(new Date(p.fecha), "dd/MM/yyyy")} <Badge color="green">{p.items.length} ejercicio(s)</Badge>
                    </p>
                    {p.notas && <p className="text-slate-500">{p.notas}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {botonCorreo("planes-ejercicios", p.id, "la guía de ejercicios")}
                    <Button variant="ghost" onClick={() => abrirPdfPlanEjercicios(p.id)}>
                      Ver PDF
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <RecetaFormModal
        open={recetaModalOpen}
        onClose={() => setRecetaModalOpen(false)}
        onCreated={cargar}
        pacienteId={pacienteId}
      />
      <PlanEjerciciosFormModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onCreated={cargar}
        pacienteId={pacienteId}
      />
      <InformeMedicoFormModal
        open={informeModalOpen}
        onClose={() => setInformeModalOpen(false)}
        onCreated={cargar}
        pacienteId={pacienteId}
      />
      <ConstanciaFormModal
        open={constanciaModalOpen}
        onClose={() => setConstanciaModalOpen(false)}
        onCreated={cargar}
        pacienteId={pacienteId}
      />
      <ExportarHistoriaModal
        open={exportarModalOpen}
        onClose={() => setExportarModalOpen(false)}
        pacienteId={pacienteId}
      />
    </div>
  );
}
