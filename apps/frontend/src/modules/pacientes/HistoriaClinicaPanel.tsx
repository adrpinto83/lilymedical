import { useEffect, useState } from "react";
import clsx from "clsx";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { BodyDiagram, PuntoDolor } from "../../components/clinical/BodyDiagram";
import { EvaluacionFisiatrica, HistoriaClinica, Sesion } from "../../types";
import { imprimirInformeConsulta, obtenerHistoriaPorPaciente, ReferenciaConsulta } from "../../services/historiasClinicas";
import { getErrorMessage } from "../../services/api";
import { format } from "date-fns";
import { EvaluacionForm } from "./fisiatria/EvaluacionForm";
import { HistoriaDatosForm } from "./HistoriaDatosForm";
import { ExportarHistoriaModal } from "../documentos/ExportarHistoriaModal";
import { NotaSesionForm } from "./fisiatria/NotaSesionForm";
import { COLOR_SERIE, GraficoEvolucion, SerieEvolucion } from "./fisiatria/GraficoEvolucion";
import {
  BARTHEL,
  DOMINANCIAS,
  OSWESTRY,
  etiquetaEscala,
  etiquetaLado,
  interpretarEva,
} from "./fisiatria/escalas";


const ASISTENCIA_LABEL = { ASISTIO: "Asistió", INASISTIO: "No asistió", CANCELO: "Canceló" } as const;

type Filtro = "todo" | "sesiones" | "evaluaciones";

export function HistoriaClinicaPanel({
  pacienteId,
  puedeEditar,
}: {
  pacienteId: string;
  /** Datos clínicos y evaluaciones son del médico; el ayudante registra sesiones. */
  puedeEditar: boolean;
}) {
  const [historia, setHistoria] = useState<HistoriaClinica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [imprimirAbierto, setImprimirAbierto] = useState(false);
  const [formulario, setFormulario] = useState<"sesion" | "evaluacion">("sesion");
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [imprimiendoId, setImprimiendoId] = useState<string | null>(null);
  const [errorInforme, setErrorInforme] = useState<string | null>(null);

  async function cargar() {
    setError(null);
    try {
      const data = await obtenerHistoriaPorPaciente(pacienteId);
      setHistoria(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function imprimirConsulta(id: string, referencia: ReferenciaConsulta) {
    setImprimiendoId(id);
    setErrorInforme(null);
    try {
      await imprimirInformeConsulta(pacienteId, referencia);
    } catch (err) {
      setErrorInforme(getErrorMessage(err));
    } finally {
      setImprimiendoId(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  if (loading) return <p className="text-sm text-slate-500">Cargando historia clínica...</p>;
  if (error && !historia) return <p className="text-sm text-red-600">{error}</p>;
  if (!historia) return null;

  const sesionesAsc = [...historia.sesiones].sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha));
  const asistidas = sesionesAsc.filter((s) => s.asistencia === "ASISTIO");
  const graficos = construirGraficos(sesionesAsc, historia.evaluaciones);
  const ultimaEva = ultimoDolor(sesionesAsc, historia.evaluaciones);

  const eventos = [
    ...historia.sesiones.map((s) => ({ tipo: "SESION" as const, fecha: s.fecha, data: s })),
    ...historia.evaluaciones.map((e) => ({ tipo: "EVALUACION" as const, fecha: e.fecha, data: e })),
  ]
    .filter((e) => filtro === "todo" || (filtro === "sesiones" ? e.tipo === "SESION" : e.tipo === "EVALUACION"))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="flex flex-col gap-6">
      {(historia.alergias || historia.contraindicaciones) && (
        <div className="flex flex-col gap-2">
          {historia.alergias && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <strong>⚠ Alergias:</strong> {historia.alergias}
            </div>
          )}
          {historia.contraindicaciones && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>⚠ Contraindicaciones para agentes físicos:</strong> {historia.contraindicaciones}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumen titulo="Diagnóstico">
          <span className="line-clamp-2">{historia.diagnosticoPrincipal || "Sin registrar"}</span>
          {historia.codigoCIE10 && <Badge color="blue">{historia.codigoCIE10}</Badge>}
        </Resumen>
        <Resumen titulo="Sesiones realizadas">
          <span className="text-2xl font-semibold text-slate-900">{asistidas.length}</span>
          {historia.sesiones.length > asistidas.length && (
            <span className="text-xs text-slate-500">
              {historia.sesiones.length - asistidas.length} inasistencia(s)
            </span>
          )}
        </Resumen>
        <Resumen titulo="Último dolor registrado">
          {ultimaEva ? (
            <>
              <span className="text-2xl font-semibold text-slate-900">{ultimaEva.valor}/10</span>
              <span className="text-xs text-slate-500">
                {interpretarEva(ultimaEva.valor)} · {format(ultimaEva.fecha, "dd/MM/yyyy")}
              </span>
            </>
          ) : (
            <span className="text-slate-500">Sin EVA registrada</span>
          )}
        </Resumen>
        <Resumen titulo="Última sesión">
          {asistidas.length ? (
            <>
              <span className="font-medium text-slate-900">
                {format(new Date(asistidas[asistidas.length - 1].fecha), "dd/MM/yyyy")}
              </span>
              {asistidas[asistidas.length - 1].terapeuta && (
                <span className="text-xs text-slate-500">
                  {asistidas[asistidas.length - 1].terapeuta!.nombre}{" "}
                  {asistidas[asistidas.length - 1].terapeuta!.apellido}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-500">Ninguna aún</span>
          )}
        </Resumen>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Historia fisiátrica</h2>
          {!editandoDatos && (
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => setImprimirAbierto(true)}>
                🖨 Imprimir
              </Button>
              {puedeEditar && (
                <Button variant="ghost" onClick={() => setEditandoDatos(true)}>
                  Editar
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardBody>
          {editandoDatos ? (
            <HistoriaDatosForm
              historia={historia}
              onCancelar={() => setEditandoDatos(false)}
              onGuardado={async () => {
                setEditandoDatos(false);
                await cargar();
              }}
            />
          ) : (
            <div className="flex flex-col gap-5">
              <Grupo titulo="Datos de la historia">
                <Dato
                  titulo="Fecha"
                  valor={historia.fechaConsulta ? format(new Date(historia.fechaConsulta.slice(0, 10) + "T12:00:00"), "dd/MM/yyyy") : null}
                />
                <Dato titulo="Ocupación" valor={historia.ocupacion} />
                <Dato titulo="Dominancia" valor={DOMINANCIAS.find((d) => d.value === historia.dominancia)?.label} />
                <Dato titulo="Actividad física" valor={historia.actividadFisica} />
              </Grupo>
              <Grupo titulo="Antecedentes">
                <Dato titulo="Familiares" valor={historia.antecedentesFamiliares} ancho />
                <Dato titulo="Personales (médicos)" valor={historia.antecedentesMedicos} medio />
                <Dato titulo="Personales (quirúrgicos)" valor={historia.antecedentesQuirurgicos} medio />
              </Grupo>
              <Grupo titulo="Consulta">
                <Dato titulo="Motivo de consulta" valor={historia.motivoConsulta} ancho />
                <Dato titulo="Enfermedad actual" valor={historia.enfermedadActual} ancho />
                <Dato titulo="Examen físico" valor={historia.examenFisico} ancho />
                <Dato titulo="Estudios complementarios" valor={historia.estudiosComplementarios} ancho />
              </Grupo>
              <Grupo titulo="Diagnóstico y plan">
                <Dato
                  titulo="IDX (diagnóstico)"
                  valor={
                    historia.diagnosticoPrincipal &&
                    `${historia.diagnosticoPrincipal}${historia.codigoCIE10 ? ` (CIE-10: ${historia.codigoCIE10})` : ""}`
                  }
                  ancho
                />
                <Dato titulo="Plan de tratamiento" valor={historia.planTerapeutico} medio />
                <Dato titulo="Objetivos de rehabilitación" valor={historia.objetivosRehabilitacion} medio />
              </Grupo>
            </div>
          )}
          {error && historia && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardBody>
      </Card>

      {graficos.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Evolución</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {graficos.map((g) => (
                <GraficoEvolucion key={g.titulo} {...g} />
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Registrar</h2>
          {puedeEditar && (
            <div className="flex rounded-lg border border-slate-200 p-1 text-sm">
              {(
                [
                  ["sesion", "Sesión de terapia"],
                  ["evaluacion", "Evaluación / escala"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  onClick={() => setFormulario(valor)}
                  className={clsx(
                    "rounded-md px-3 py-1",
                    formulario === valor ? "bg-lily-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardBody>
          {formulario === "evaluacion" && puedeEditar ? (
            <EvaluacionForm pacienteId={pacienteId} onSaved={cargar} />
          ) : (
            <NotaSesionForm pacienteId={pacienteId} contraindicaciones={historia.contraindicaciones} onSaved={cargar} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Línea de tiempo</h2>
          <div className="flex gap-1 text-xs">
            {(
              [
                ["todo", "Todo"],
                ["sesiones", "Sesiones"],
                ["evaluaciones", "Evaluaciones"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setFiltro(valor)}
                className={clsx(
                  "rounded-full border px-2.5 py-0.5",
                  filtro === valor
                    ? "border-lily-blue-600 bg-lily-blue-600 text-white"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          {errorInforme && <p className="mb-3 text-sm text-red-600">{errorInforme}</p>}
          {eventos.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay registros.</p>
          ) : (
            <ol className="flex flex-col gap-4 border-l border-slate-200 pl-4">
              {eventos.map((ev) => (
                <li key={`${ev.tipo}-${ev.data.id}`} className="relative">
                  <span
                    className={clsx(
                      "absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full",
                      ev.tipo === "SESION" ? "bg-lily-green-500" : "bg-lily-blue-500"
                    )}
                  />
                  {ev.tipo === "SESION" ? (
                    <ItemSesion
                      s={ev.data}
                      imprimiendo={imprimiendoId === ev.data.id}
                      onImprimir={() => imprimirConsulta(ev.data.id, { sesionId: ev.data.id })}
                    />
                  ) : (
                    <ItemEvaluacion
                      e={ev.data}
                      imprimiendo={imprimiendoId === ev.data.id}
                      onImprimir={() => imprimirConsulta(ev.data.id, { evaluacionId: ev.data.id })}
                    />
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
      <ExportarHistoriaModal open={imprimirAbierto} onClose={() => setImprimirAbierto(false)} pacienteId={pacienteId} />
    </div>
  );
}

// ------------------------------------------------------------ piezas

function Resumen({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-sm">
      <span className="text-xs text-slate-500">{titulo}</span>
      {children}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">{children}</dl>
    </section>
  );
}

// Los textos largos (enfermedad actual, examen...) ocupan todo el ancho para
// leerse como en la hoja; los datos cortos van en columnas.
function Dato({
  titulo,
  valor,
  ancho,
  medio,
}: {
  titulo: string;
  valor?: string | null;
  ancho?: boolean;
  medio?: boolean;
}) {
  return (
    <div className={clsx(ancho && "sm:col-span-2 lg:col-span-4", medio && "sm:col-span-1 lg:col-span-2")}>
      <dt className="text-slate-500">{titulo}</dt>
      <dd className="whitespace-pre-line text-slate-900">{valor || "—"}</dd>
    </div>
  );
}

function Encabezado({
  fecha,
  badge,
  color,
  quien,
  imprimir,
}: {
  fecha: string;
  badge: string;
  color: "green" | "blue" | "amber" | "slate";
  quien?: { nombre: string; apellido: string };
  imprimir?: Imprimir;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span>{format(new Date(fecha), "dd/MM/yyyy HH:mm")}</span>
      <Badge color={color}>{badge}</Badge>
      {quien && (
        <span>
          {quien.nombre} {quien.apellido}
        </span>
      )}
      {imprimir && (
        <button
          type="button"
          onClick={imprimir.onImprimir}
          disabled={imprimir.imprimiendo}
          title="Imprimir el informe de esta consulta (solo lo registrado ese día)"
          className="ml-auto rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
        >
          {imprimir.imprimiendo ? "Preparando..." : "🖨 Informe"}
        </button>
      )}
    </div>
  );
}

// Imprime el informe de la consulta de ese día: es lo que se le entrega al
// paciente, sin el resto de la historia.
interface Imprimir {
  onImprimir: () => void;
  imprimiendo: boolean;
}

function ItemSesion({ s, ...imprimir }: { s: Sesion } & Imprimir) {
  const asistio = s.asistencia === "ASISTIO";
  return (
    <div>
      <Encabezado
        fecha={s.fecha}
        badge={asistio ? "Sesión" : ASISTENCIA_LABEL[s.asistencia]}
        color={asistio ? "green" : "amber"}
        quien={s.terapeuta}
        imprimir={asistio ? imprimir : undefined}
      />
      <div className="mt-1 flex flex-col gap-1 text-sm text-slate-800">
        {(s.evaPre != null || s.evaPost != null) && (
          <p className="text-xs text-slate-600">
            Dolor (EVA): <strong>{s.evaPre ?? "—"}</strong> → <strong>{s.evaPost ?? "—"}</strong>
            {s.evaPre != null && s.evaPost != null && s.evaPre !== s.evaPost && (
              <span className="ml-1 text-slate-500">
                ({s.evaPost < s.evaPre ? "bajó" : "subió"} {Math.abs(s.evaPre - s.evaPost)})
              </span>
            )}
          </p>
        )}
        {s.modalidades && s.modalidades.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {s.modalidades.map((m) => (
              <span key={m} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                {m}
              </span>
            ))}
          </div>
        )}
        <p className="whitespace-pre-line">{s.notaEvolucion}</p>
        {s.tratamientoAplicado && <p className="text-slate-500">Tratamiento: {s.tratamientoAplicado}</p>}
      </div>
    </div>
  );
}

interface DatosEvaluacion {
  interpretacion?: string;
  caracter?: string[];
  puntosDolor?: PuntoDolor[];
  items?: Record<string, number | null>;
  mediciones?: Array<{
    articulacion?: string;
    movimiento?: string;
    grupo?: string;
    lado?: string;
    grados?: number | null;
    normal?: number | null;
    grado?: number | null;
  }>;
}

function ItemEvaluacion({ e, ...imprimir }: { e: EvaluacionFisiatrica } & Imprimir) {
  const d = (e.datos ?? {}) as DatosEvaluacion;
  const sufijo = e.tipoEscala === "OSWESTRY" ? "%" : e.tipoEscala === "EVA" ? "/10" : e.tipoEscala === "BARTHEL" ? "/100" : "";
  const items = e.tipoEscala === "BARTHEL" ? BARTHEL : e.tipoEscala === "OSWESTRY" ? OSWESTRY : null;
  return (
    <div>
      <Encabezado fecha={e.fecha} badge="Evaluación" color="blue" quien={e.evaluador} imprimir={imprimir} />
      <div className="mt-1 flex flex-col gap-1 text-sm text-slate-800">
        <p>
          <span className="font-medium">{etiquetaEscala(e.tipoEscala, e.nombreEscala)}</span>
          {e.puntajeTotal != null && `: ${e.puntajeTotal}${sufijo}`}
          {d.interpretacion && <span className="text-slate-500"> · {d.interpretacion}</span>}
        </p>
        {d.caracter && d.caracter.length > 0 && <p className="text-xs text-slate-500">Dolor {d.caracter.join(", ").toLowerCase()}</p>}
        {items && d.items && (
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer text-slate-400">Ver respuestas</summary>
            <ul className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {items.map((i) => (
                <li key={i.clave} className="flex justify-between gap-2">
                  <span>{i.titulo}</span>
                  <span className="tabular-nums">{d.items![i.clave] ?? "—"}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {d.mediciones && d.mediciones.length > 0 && (
          <ul className="text-xs text-slate-600">
            {d.mediciones.map((m, i) => (
              <li key={i}>
                {m.grados != null ? (
                  <>
                    {m.articulacion} · {m.movimiento} {etiquetaLado(m.lado)}: <strong>{m.grados}°</strong>
                    {m.normal ? <span className="text-slate-400"> (normal {m.normal}°)</span> : null}
                  </>
                ) : (
                  <>
                    {m.grupo} {etiquetaLado(m.lado)}: <strong>{m.grado}/5</strong>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {e.observaciones && <p className="text-slate-500">{e.observaciones}</p>}
        {d.puntosDolor && d.puntosDolor.length > 0 && <BodyDiagram puntos={d.puntosDolor} className="mt-2 items-start" />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ datos

function ultimoDolor(sesiones: Sesion[], evaluaciones: EvaluacionFisiatrica[]) {
  const candidatos = [
    ...sesiones
      .filter((s) => s.evaPost != null || s.evaPre != null)
      .map((s) => ({ fecha: new Date(s.fecha), valor: (s.evaPost ?? s.evaPre)! })),
    ...evaluaciones
      .filter((e) => e.tipoEscala === "EVA" && e.puntajeTotal != null)
      .map((e) => ({ fecha: new Date(e.fecha), valor: e.puntajeTotal! })),
  ].sort((a, b) => +b.fecha - +a.fecha);
  return candidatos[0] ?? null;
}

function construirGraficos(sesiones: Sesion[], evaluaciones: EvaluacionFisiatrica[]) {
  const graficos: {
    titulo: string;
    series: SerieEvolucion[];
    yMax: number;
    sufijo?: string;
    mejorEsMenor?: boolean;
  }[] = [];

  const conEva = sesiones.filter((s) => s.asistencia === "ASISTIO" && (s.evaPre != null || s.evaPost != null));
  if (conEva.length >= 2) {
    graficos.push({
      titulo: "Dolor por sesión (EVA)",
      yMax: 10,
      mejorEsMenor: true,
      series: [
        {
          nombre: "Al llegar",
          color: COLOR_SERIE[0],
          puntos: conEva.filter((s) => s.evaPre != null).map((s) => ({ fecha: new Date(s.fecha), valor: s.evaPre! })),
        },
        {
          nombre: "Al salir",
          color: COLOR_SERIE[1],
          puntos: conEva.filter((s) => s.evaPost != null).map((s) => ({ fecha: new Date(s.fecha), valor: s.evaPost! })),
        },
      ].filter((s) => s.puntos.length > 0),
    });
  }

  const porEscala = new Map<string, { titulo: string; tipo: string; puntos: { fecha: Date; valor: number }[] }>();
  for (const e of [...evaluaciones].sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha))) {
    if (e.puntajeTotal == null) continue;
    const clave = e.tipoEscala === "PERSONALIZADA" ? `P:${e.nombreEscala}` : e.tipoEscala;
    if (!porEscala.has(clave)) porEscala.set(clave, { titulo: etiquetaEscala(e.tipoEscala, e.nombreEscala), tipo: e.tipoEscala, puntos: [] });
    porEscala.get(clave)!.puntos.push({ fecha: new Date(e.fecha), valor: e.puntajeTotal });
  }
  for (const g of porEscala.values()) {
    if (g.puntos.length < 2) continue;
    const max = g.tipo === "EVA" ? 10 : g.tipo === "BARTHEL" || g.tipo === "OSWESTRY" ? 100 : Math.max(...g.puntos.map((p) => p.valor)) || 1;
    graficos.push({
      titulo: g.titulo,
      yMax: max,
      sufijo: g.tipo === "OSWESTRY" ? "%" : "",
      mejorEsMenor: g.tipo === "BARTHEL" ? false : g.tipo === "PERSONALIZADA" ? undefined : true,
      series: [{ nombre: g.titulo, color: COLOR_SERIE[0], puntos: g.puntos }],
    });
  }
  return graficos;
}
