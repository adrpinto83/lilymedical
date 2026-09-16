import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { BodyDiagram, PuntoDolor } from "../../components/clinical/BodyDiagram";
import { HistoriaClinica } from "../../types";
import {
  obtenerHistoriaPorPaciente,
  actualizarHistoria,
  agregarEvaluacion,
} from "../../services/historiasClinicas";
import { crearSesion } from "../../services/sesiones";
import { getErrorMessage } from "../../services/api";
import { format } from "date-fns";

const escalas = [
  { value: "EVA", label: "Escala Visual Análoga (dolor)" },
  { value: "BARTHEL", label: "Índice de Barthel" },
  { value: "OSWESTRY", label: "Índice de Oswestry" },
  { value: "GONIOMETRICA", label: "Evaluación goniométrica" },
  { value: "FUERZA_MUSCULAR", label: "Fuerza muscular" },
  { value: "PERSONALIZADA", label: "Escala personalizada" },
];

export function HistoriaClinicaPanel({ pacienteId }: { pacienteId: string }) {
  const [historia, setHistoria] = useState<HistoriaClinica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [datosForm, setDatosForm] = useState({
    motivoConsulta: "",
    diagnosticoPrincipal: "",
    codigoCIE10: "",
    antecedentesMedicos: "",
    antecedentesQuirurgicos: "",
    antecedentesFamiliares: "",
    alergias: "",
  });
  const [notaForm, setNotaForm] = useState({ notaEvolucion: "", tratamientoAplicado: "" });
  const [evalForm, setEvalForm] = useState({
    tipoEscala: "EVA",
    nombreEscala: "",
    puntajeTotal: "",
    observaciones: "",
  });
  const [puntosDolor, setPuntosDolor] = useState<PuntoDolor[]>([]);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerHistoriaPorPaciente(pacienteId);
      setHistoria(data);
      setDatosForm({
        motivoConsulta: data.motivoConsulta ?? "",
        diagnosticoPrincipal: data.diagnosticoPrincipal ?? "",
        codigoCIE10: data.codigoCIE10 ?? "",
        antecedentesMedicos: data.antecedentesMedicos ?? "",
        antecedentesQuirurgicos: data.antecedentesQuirurgicos ?? "",
        antecedentesFamiliares: data.antecedentesFamiliares ?? "",
        alergias: data.alergias ?? "",
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function guardarDatos(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarHistoria(pacienteId, datosForm);
      setEditandoDatos(false);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  async function agregarNota(e: FormEvent) {
    e.preventDefault();
    if (!notaForm.notaEvolucion.trim()) return;
    setGuardando(true);
    try {
      await crearSesion({ pacienteId, ...notaForm });
      setNotaForm({ notaEvolucion: "", tratamientoAplicado: "" });
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEvaluacion(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await agregarEvaluacion(pacienteId, {
        tipoEscala: evalForm.tipoEscala,
        nombreEscala: evalForm.nombreEscala || undefined,
        datos: puntosDolor.length > 0 ? { puntosDolor } : {},
        puntajeTotal: evalForm.puntajeTotal ? Number(evalForm.puntajeTotal) : undefined,
        observaciones: evalForm.observaciones || undefined,
      });
      setEvalForm({ tipoEscala: "EVA", nombreEscala: "", puntajeTotal: "", observaciones: "" });
      setPuntosDolor([]);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Cargando historia clínica...</p>;
  if (error && !historia) return <p className="text-sm text-red-600">{error}</p>;
  if (!historia) return null;

  const eventos = [
    ...historia.sesiones.map((s) => ({ tipo: "SESION" as const, fecha: s.fecha, data: s })),
    ...historia.evaluaciones.map((e) => ({ tipo: "EVALUACION" as const, fecha: e.fecha, data: e })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="flex flex-col gap-6">
      {historia.alergias && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>⚠ Alergias:</strong> {historia.alergias}
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Datos clínicos generales</h2>
          {!editandoDatos && (
            <Button variant="ghost" onClick={() => setEditandoDatos(true)}>
              Editar
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {editandoDatos ? (
            <form onSubmit={guardarDatos} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Textarea
                label="Motivo de consulta"
                value={datosForm.motivoConsulta}
                onChange={(e) => setDatosForm((f) => ({ ...f, motivoConsulta: e.target.value }))}
              />
              <Textarea
                label="Diagnóstico principal"
                value={datosForm.diagnosticoPrincipal}
                onChange={(e) => setDatosForm((f) => ({ ...f, diagnosticoPrincipal: e.target.value }))}
              />
              <Input
                label="Código CIE-10"
                value={datosForm.codigoCIE10}
                onChange={(e) => setDatosForm((f) => ({ ...f, codigoCIE10: e.target.value }))}
                placeholder="ej. M54.5"
              />
              <Textarea
                label="Alergias"
                value={datosForm.alergias}
                onChange={(e) => setDatosForm((f) => ({ ...f, alergias: e.target.value }))}
                placeholder="ej. Penicilina, AINES, látex"
                hint="Se muestra como alerta en las recetas del paciente"
              />
              <Textarea
                label="Antecedentes médicos"
                value={datosForm.antecedentesMedicos}
                onChange={(e) => setDatosForm((f) => ({ ...f, antecedentesMedicos: e.target.value }))}
              />
              <Textarea
                label="Antecedentes quirúrgicos"
                value={datosForm.antecedentesQuirurgicos}
                onChange={(e) => setDatosForm((f) => ({ ...f, antecedentesQuirurgicos: e.target.value }))}
              />
              <Textarea
                label="Antecedentes familiares"
                value={datosForm.antecedentesFamiliares}
                onChange={(e) => setDatosForm((f) => ({ ...f, antecedentesFamiliares: e.target.value }))}
              />
              <div className="flex items-end justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditandoDatos(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={guardando}>
                  Guardar
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Motivo de consulta</dt>
                <dd className="text-slate-900">{historia.motivoConsulta || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Diagnóstico principal</dt>
                <dd className="text-slate-900">
                  {historia.diagnosticoPrincipal || "—"}{" "}
                  {historia.codigoCIE10 && <Badge color="blue">{historia.codigoCIE10}</Badge>}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Antecedentes médicos</dt>
                <dd className="text-slate-900">{historia.antecedentesMedicos || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Antecedentes quirúrgicos</dt>
                <dd className="text-slate-900">{historia.antecedentesQuirurgicos || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Antecedentes familiares</dt>
                <dd className="text-slate-900">{historia.antecedentesFamiliares || "—"}</dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Nueva nota de evolución</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={agregarNota} className="flex flex-col gap-3">
              <Textarea
                label="Nota de evolución"
                required
                value={notaForm.notaEvolucion}
                onChange={(e) => setNotaForm((f) => ({ ...f, notaEvolucion: e.target.value }))}
              />
              <Textarea
                label="Tratamiento aplicado"
                value={notaForm.tratamientoAplicado}
                onChange={(e) => setNotaForm((f) => ({ ...f, tratamientoAplicado: e.target.value }))}
              />
              <Button type="submit" disabled={guardando} className="self-end">
                Agregar sesión
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Nueva evaluación fisiátrica</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={guardarEvaluacion} className="flex flex-col gap-3">
              <Select
                label="Escala"
                value={evalForm.tipoEscala}
                onChange={(e) => setEvalForm((f) => ({ ...f, tipoEscala: e.target.value }))}
              >
                {escalas.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Select>
              {evalForm.tipoEscala === "PERSONALIZADA" && (
                <Input
                  label="Nombre de la escala"
                  value={evalForm.nombreEscala}
                  onChange={(e) => setEvalForm((f) => ({ ...f, nombreEscala: e.target.value }))}
                />
              )}
              <Input
                label="Puntaje / valor"
                type="number"
                step="0.1"
                value={evalForm.puntajeTotal}
                onChange={(e) => setEvalForm((f) => ({ ...f, puntajeTotal: e.target.value }))}
                hint="Ej. EVA 0-10, Barthel 0-100, grados de movimiento, etc."
              />
              <Textarea
                label="Observaciones"
                value={evalForm.observaciones}
                onChange={(e) => setEvalForm((f) => ({ ...f, observaciones: e.target.value }))}
              />
              <BodyDiagram puntos={puntosDolor} onChange={setPuntosDolor} />
              <Button type="submit" disabled={guardando} className="self-end">
                Guardar evaluación
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Línea de tiempo de evolución</h2>
        </CardHeader>
        <CardBody>
          {eventos.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay sesiones ni evaluaciones registradas.</p>
          ) : (
            <ol className="flex flex-col gap-4 border-l border-slate-200 pl-4">
              {eventos.map((ev) => (
                <li key={`${ev.tipo}-${ev.data.id}`} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-lily-blue-500" />
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{format(new Date(ev.fecha), "dd/MM/yyyy HH:mm")}</span>
                    <Badge color={ev.tipo === "SESION" ? "green" : "blue"}>
                      {ev.tipo === "SESION" ? "Sesión" : "Evaluación"}
                    </Badge>
                  </div>
                  {ev.tipo === "SESION" ? (
                    <div className="mt-1 text-sm text-slate-800">
                      <p>{ev.data.notaEvolucion}</p>
                      {ev.data.tratamientoAplicado && (
                        <p className="mt-1 text-slate-500">Tratamiento: {ev.data.tratamientoAplicado}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-slate-800">
                      <p>
                        {escalas.find((e) => e.value === ev.data.tipoEscala)?.label ?? ev.data.tipoEscala}
                        {ev.data.puntajeTotal !== null && ev.data.puntajeTotal !== undefined
                          ? `: ${ev.data.puntajeTotal}`
                          : ""}
                      </p>
                      {ev.data.observaciones && <p className="mt-1 text-slate-500">{ev.data.observaciones}</p>}
                      {Array.isArray((ev.data.datos as { puntosDolor?: PuntoDolor[] } | undefined)?.puntosDolor) &&
                        (ev.data.datos as { puntosDolor: PuntoDolor[] }).puntosDolor.length > 0 && (
                          <BodyDiagram
                            puntos={(ev.data.datos as { puntosDolor: PuntoDolor[] }).puntosDolor}
                            className="mt-2 items-start"
                          />
                        )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
