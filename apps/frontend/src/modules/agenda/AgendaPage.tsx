import { useEffect, useState, useCallback } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { Cita, BloqueoHorario, EstadoCita } from "../../types";
import { Profesional, listarProfesionales } from "../../services/usuarios";
import { listarCitas, listarBloqueos, actualizarCita, eliminarBloqueo } from "../../services/citas";
import {
  Cumpleanero,
  enviarFelicitacionesAhora,
  enviarRecordatoriosAhora,
  listarCumpleanerosDeHoy,
} from "../../services/recordatorios";
import { getErrorMessage } from "../../services/api";
import { TimeGridView } from "./TimeGridView";
import { MonthView } from "./MonthView";
import { ListView } from "./ListView";
import { CitaFormModal } from "./CitaFormModal";
import { CitaRecurrenteModal } from "./CitaRecurrenteModal";
import { CitaDetailModal } from "./CitaDetailModal";
import { BloqueoModal } from "./BloqueoModal";
import { ESTADOS_CITA, ESTADO_CITA } from "./agendaUtils";

type Vista = "dia" | "semana" | "mes" | "lista";

const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: "dia", etiqueta: "Día" },
  { valor: "semana", etiqueta: "Semana" },
  { valor: "mes", etiqueta: "Mes" },
  { valor: "lista", etiqueta: "Lista" },
];

const CLAVE_VISTA = "lilymedical_agenda_vista";

function vistaGuardada(): Vista {
  try {
    const v = localStorage.getItem(CLAVE_VISTA);
    if (VISTAS.some((x) => x.valor === v)) return v as Vista;
  } catch {
    // almacenamiento no disponible: se usa la vista por defecto
  }
  return "semana";
}

export function AgendaPage() {
  const { user } = useAuth();
  // El fisiatra ayudante solo consulta la agenda (el backend rechaza sus cambios).
  const puedeGestionar = user?.rol !== "FISIATRA_AYUDANTE";

  const [vista, setVista] = useState<Vista>(vistaGuardada);
  const [fecha, setFecha] = useState(new Date());
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profesionalId, setProfesionalId] = useState<string>("");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [estadosOcultos, setEstadosOcultos] = useState<EstadoCita[]>([]);
  const [citaModalOpen, setCitaModalOpen] = useState(false);
  const [recurrenteModalOpen, setRecurrenteModalOpen] = useState(false);
  const [bloqueoModalOpen, setBloqueoModalOpen] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState<Date | undefined>();
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [enviandoRecordatorios, setEnviandoRecordatorios] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cumpleaneros, setCumpleaneros] = useState<Cumpleanero[]>([]);
  const [felicitando, setFelicitando] = useState(false);

  useEffect(() => {
    listarProfesionales()
      .then((lista) => {
        setProfesionales(lista);
        // Un médico abre la agenda viendo la suya; puede cambiar a "Todos".
        if (user?.rol === "MEDICO" && lista.some((p) => p.id === user.id)) setProfesionalId(user.id);
      })
      .catch(() => setProfesionales([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarVista(v: Vista) {
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      // sin almacenamiento: la vista no se recuerda, no es grave
    }
  }

  function rangoActual(): [Date, Date] {
    if (vista === "dia") {
      const inicio = new Date(fecha);
      inicio.setHours(0, 0, 0, 0);
      return [inicio, addDays(inicio, 1)];
    }
    if (vista === "semana" || vista === "lista") {
      const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
      return [inicio, addDays(inicio, 7)];
    }
    return [
      startOfWeek(startOfMonth(fecha), { weekStartsOn: 1 }),
      addDays(endOfWeek(endOfMonth(fecha), { weekStartsOn: 1 }), 1),
    ];
  }

  const cargar = useCallback(async () => {
    const [desde, hasta] = rangoActual();
    setCargando(true);
    setErrorCarga(null);
    try {
      const [c, b] = await Promise.all([
        listarCitas(desde, hasta, profesionalId || undefined),
        listarBloqueos(desde, hasta, profesionalId || undefined),
      ]);
      setCitas(c);
      setBloqueos(b);
    } catch (err) {
      setErrorCarga(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, fecha, profesionalId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const navegar = useCallback(
    (direccion: 1 | -1) => {
      if (vista === "dia") setFecha((f) => addDays(f, direccion));
      else if (vista === "mes") setFecha((f) => addMonths(f, direccion));
      else setFecha((f) => addWeeks(f, direccion));
    },
    [vista]
  );

  const hayModalAbierto = citaModalOpen || recurrenteModalOpen || bloqueoModalOpen || !!citaSeleccionada;

  // Atajos: ← / → para moverse y "h" para volver a hoy (fuera de campos de texto y modales).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (hayModalAbierto || e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") navegar(-1);
      else if (e.key === "ArrowRight") navegar(1);
      else if (e.key === "h" || e.key === "H") setFecha(new Date());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navegar, hayModalAbierto]);

  useEffect(() => {
    if (!puedeGestionar) return;
    listarCumpleanerosDeHoy()
      .then(setCumpleaneros)
      .catch(() => setCumpleaneros([]));
  }, [puedeGestionar]);

  // El job ya felicita solo cada mañana; el botón muestra quién cumple hoy
  // y envía en el momento las felicitaciones que falten.
  async function felicitarCumpleaneros() {
    setFelicitando(true);
    setMensaje(null);
    try {
      const r = await enviarFelicitacionesAhora();
      setCumpleaneros(r.cumpleaneros);
      if (r.cumpleaneros.length === 0) {
        setMensaje("Hoy ningún paciente cumple años.");
      } else if (!r.configurado) {
        setMensaje("El envío de correos no está configurado (falta SMTP).");
      } else {
        const detalle = r.cumpleaneros
          .map((c) => `${c.nombre} (${c.felicitado ? "felicitado ✓" : c.email ? "no se pudo enviar" : "sin correo"})`)
          .join(", ");
        setMensaje(
          `🎂 Cumplen años hoy: ${detalle}.` +
            (r.enviados > 0 ? ` Se enviaron ${r.enviados} felicitación(es) ahora.` : "")
        );
      }
    } catch (err) {
      setMensaje(getErrorMessage(err));
    } finally {
      setFelicitando(false);
    }
  }

  async function enviarRecordatorios() {
    setEnviandoRecordatorios(true);
    setMensaje(null);
    try {
      const r = await enviarRecordatoriosAhora();
      if (!r.configurado) {
        setMensaje("El envío de recordatorios por email no está configurado (falta SMTP).");
      } else {
        setMensaje(
          `${r.enviados} recordatorio(s) enviado(s)` +
            (r.sinEmail > 0 ? `, ${r.sinEmail} paciente(s) sin email registrado` : "") +
            (r.fallidos > 0 ? `, ${r.fallidos} fallido(s)` : "") +
            (r.revisadas === 0 ? " (no había citas próximas pendientes)" : "")
        );
      }
    } catch (err) {
      setMensaje(getErrorMessage(err));
    } finally {
      setEnviandoRecordatorios(false);
    }
  }

  async function cambiarEstadoRapido(cita: Cita, estado: EstadoCita) {
    setActualizando(cita.id);
    setMensaje(null);
    try {
      await actualizarCita(cita.id, { estado });
      await cargar();
    } catch (err) {
      setMensaje(getErrorMessage(err));
    } finally {
      setActualizando(null);
    }
  }

  async function quitarBloqueo(bloqueo: BloqueoHorario) {
    const rango = `${format(new Date(bloqueo.fechaHoraInicio), "dd/MM HH:mm")}–${format(new Date(bloqueo.fechaHoraFin), "HH:mm")}`;
    if (!confirm(`¿Quitar el bloqueo "${bloqueo.motivo || "Bloqueado"}" (${rango})?`)) return;
    try {
      await eliminarBloqueo(bloqueo.id);
      await cargar();
    } catch (err) {
      setMensaje(getErrorMessage(err));
    }
  }

  function abrirNuevaCita(fechaSlot?: Date) {
    setSlotSeleccionado(fechaSlot);
    setCitaModalOpen(true);
  }

  function diasVisibles(): Date[] {
    if (vista === "dia") return [fecha];
    const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  }

  function tituloRango() {
    if (vista === "mes") return format(fecha, "MMMM yyyy", { locale: es });
    if (vista === "dia") return format(fecha, "EEEE d 'de' MMMM yyyy", { locale: es });
    const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
    return `${format(inicio, "d MMM", { locale: es })} – ${format(addDays(inicio, 6), "d MMM yyyy", { locale: es })}`;
  }

  function toggleEstado(estado: EstadoCita) {
    setEstadosOcultos((prev) => (prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado]));
  }

  const citasVisibles = citas.filter((c) => !estadosOcultos.includes(c.estado));
  const conteo = (estado: EstadoCita) => citas.filter((c) => c.estado === estado).length;
  const mostrarProfesional = !profesionalId;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
          <p className="text-sm capitalize text-slate-500">{tituloRango()}</p>
        </div>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={felicitarCumpleaneros}
              disabled={felicitando}
              title="Felicitaciones de cumpleaños por email (se envían solas cada mañana)"
            >
              {felicitando ? "Enviando..." : `🎂 Cumpleaños de hoy${cumpleaneros.length ? ` (${cumpleaneros.length})` : ""}`}
            </Button>
            <Button variant="ghost" onClick={enviarRecordatorios} disabled={enviandoRecordatorios}>
              {enviandoRecordatorios ? "Enviando..." : "✉️ Recordatorios por email"}
            </Button>
            <Button variant="secondary" onClick={() => setBloqueoModalOpen(true)}>
              🚫 Bloquear horario
            </Button>
            <Button variant="secondary" onClick={() => setRecurrenteModalOpen(true)}>
              + Paquete de sesiones
            </Button>
            <Button onClick={() => abrirNuevaCita()}>+ Nueva cita</Button>
          </div>
        )}
      </div>

      {mensaje && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>{mensaje}</p>
          <button onClick={() => setMensaje(null)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navegar(-1)} title="Anterior (←)" aria-label="Anterior">
            ←
          </Button>
          <Button variant="secondary" onClick={() => setFecha(new Date())} title="Ir a hoy (H)">
            Hoy
          </Button>
          <Button variant="secondary" onClick={() => navegar(1)} title="Siguiente (→)" aria-label="Siguiente">
            →
          </Button>
          <input
            type="date"
            aria-label="Ir a una fecha"
            title="Ir a una fecha"
            value={format(fecha, "yyyy-MM-dd")}
            onChange={(e) => e.target.value && setFecha(new Date(`${e.target.value}T12:00:00`))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} className="w-56">
            <option value="">Todos los profesionales</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </Select>
          <div className="flex rounded-lg border border-slate-200 p-1">
            {VISTAS.map((v) => (
              <button
                key={v.valor}
                onClick={() => cambiarVista(v.valor)}
                className={clsx(
                  "rounded-md px-3 py-1 text-sm",
                  vista === v.valor ? "bg-lily-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {v.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">{citas.length} cita{citas.length === 1 ? "" : "s"} en el período ·</span>
        {ESTADOS_CITA.map((estado) => {
          const oculto = estadosOcultos.includes(estado);
          return (
            <button
              key={estado}
              type="button"
              onClick={() => toggleEstado(estado)}
              title={oculto ? "Mostrar" : "Ocultar"}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                oculto ? "border-dashed border-slate-300 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className={clsx("h-2 w-2 rounded-full", oculto ? "bg-slate-300" : ESTADO_CITA[estado].punto)} />
              <span className={clsx(oculto && "line-through")}>{ESTADO_CITA[estado].label}</span>
              <span className="font-medium">{conteo(estado)}</span>
            </button>
          );
        })}
        {cargando && <span className="text-slate-400">Cargando...</span>}
      </div>

      {errorCarga && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>No se pudo cargar la agenda: {errorCarga}</p>
          <Button variant="secondary" onClick={cargar}>
            Reintentar
          </Button>
        </div>
      )}

      <div className={clsx("rounded-xl border border-slate-200 bg-white p-4 transition-opacity", cargando && "opacity-60")}>
        {vista === "mes" ? (
          <MonthView
            mes={fecha}
            citas={citasVisibles}
            bloqueos={bloqueos}
            onDiaClick={(dia) => {
              setFecha(dia);
              cambiarVista("dia");
            }}
            onCitaClick={setCitaSeleccionada}
          />
        ) : vista === "lista" ? (
          <ListView
            dias={diasVisibles()}
            citas={citasVisibles}
            mostrarProfesional={mostrarProfesional}
            actualizando={actualizando}
            onCitaClick={setCitaSeleccionada}
            onCambiarEstado={puedeGestionar ? cambiarEstadoRapido : undefined}
          />
        ) : (
          <TimeGridView
            dias={diasVisibles()}
            citas={citasVisibles}
            bloqueos={bloqueos}
            mostrarProfesional={mostrarProfesional}
            onSlotClick={puedeGestionar ? abrirNuevaCita : undefined}
            onCitaClick={setCitaSeleccionada}
            onBloqueoClick={puedeGestionar ? quitarBloqueo : undefined}
          />
        )}
      </div>

      {puedeGestionar && vista !== "mes" && vista !== "lista" && (
        <p className="text-xs text-slate-400">
          Haz clic en un espacio libre para agendar a esa hora · clic en un bloqueo para quitarlo · ← → para
          navegar, H para hoy.
        </p>
      )}

      <CitaFormModal
        open={citaModalOpen}
        onClose={() => setCitaModalOpen(false)}
        onCreated={cargar}
        profesionales={profesionales}
        fechaInicial={slotSeleccionado}
        profesionalInicial={profesionalId || undefined}
      />
      <CitaRecurrenteModal
        open={recurrenteModalOpen}
        onClose={() => setRecurrenteModalOpen(false)}
        onCreated={cargar}
        profesionales={profesionales}
        profesionalInicial={profesionalId || undefined}
      />
      <BloqueoModal
        open={bloqueoModalOpen}
        onClose={() => setBloqueoModalOpen(false)}
        onCreated={cargar}
        profesionales={profesionales}
        fechaInicial={fecha}
        profesionalInicial={profesionalId || undefined}
      />
      <CitaDetailModal
        cita={citaSeleccionada}
        profesionales={profesionales}
        puedeGestionar={puedeGestionar}
        onClose={() => setCitaSeleccionada(null)}
        onUpdated={cargar}
      />
    </div>
  );
}
