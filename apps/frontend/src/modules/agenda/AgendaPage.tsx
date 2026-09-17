import { useEffect, useState, useCallback } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  startOfWeek as startWeek,
  endOfWeek,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Input";
import { Cita, BloqueoHorario } from "../../types";
import { Profesional, listarProfesionales } from "../../services/usuarios";
import { listarCitas, listarBloqueos } from "../../services/citas";
import { enviarRecordatoriosAhora } from "../../services/recordatorios";
import { getErrorMessage } from "../../services/api";
import { TimeGridView } from "./TimeGridView";
import { MonthView } from "./MonthView";
import { CitaFormModal } from "./CitaFormModal";
import { CitaRecurrenteModal } from "./CitaRecurrenteModal";
import { CitaDetailModal } from "./CitaDetailModal";

type Vista = "dia" | "semana" | "mes";

export function AgendaPage() {
  const [vista, setVista] = useState<Vista>("semana");
  const [fecha, setFecha] = useState(new Date());
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profesionalId, setProfesionalId] = useState<string>("");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>([]);
  const [citaModalOpen, setCitaModalOpen] = useState(false);
  const [recurrenteModalOpen, setRecurrenteModalOpen] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState<Date | undefined>();
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [enviandoRecordatorios, setEnviandoRecordatorios] = useState(false);
  const [mensajeRecordatorios, setMensajeRecordatorios] = useState<string | null>(null);

  useEffect(() => {
    listarProfesionales().then(setProfesionales).catch(() => setProfesionales([]));
  }, []);

  function rangoActual(): [Date, Date] {
    if (vista === "dia") return [fecha, addDays(fecha, 1)];
    if (vista === "semana") {
      const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
      return [inicio, addDays(inicio, 7)];
    }
    return [startWeek(startOfMonth(fecha), { weekStartsOn: 1 }), addDays(endOfWeek(endOfMonth(fecha), { weekStartsOn: 1 }), 1)];
  }

  const cargar = useCallback(async () => {
    const [desde, hasta] = rangoActual();
    const [c, b] = await Promise.all([
      listarCitas(desde, hasta, profesionalId || undefined),
      listarBloqueos(desde, hasta, profesionalId || undefined),
    ]);
    setCitas(c);
    setBloqueos(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, fecha, profesionalId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function navegar(direccion: 1 | -1) {
    if (vista === "dia") setFecha((f) => addDays(f, direccion));
    else if (vista === "semana") setFecha((f) => addWeeks(f, direccion));
    else setFecha((f) => addMonths(f, direccion));
  }

  async function enviarRecordatorios() {
    setEnviandoRecordatorios(true);
    setMensajeRecordatorios(null);
    try {
      const r = await enviarRecordatoriosAhora();
      if (!r.configurado) {
        setMensajeRecordatorios("El envío de recordatorios por email no está configurado (falta SMTP).");
      } else {
        setMensajeRecordatorios(
          `${r.enviados} recordatorio(s) enviado(s)` +
            (r.sinEmail > 0 ? `, ${r.sinEmail} paciente(s) sin email registrado` : "") +
            (r.fallidos > 0 ? `, ${r.fallidos} fallido(s)` : "") +
            (r.revisadas === 0 ? " (no había citas próximas pendientes)" : "")
        );
      }
    } catch (err) {
      setMensajeRecordatorios(getErrorMessage(err));
    } finally {
      setEnviandoRecordatorios(false);
    }
  }

  function diasVisibles(): Date[] {
    if (vista === "dia") return [fecha];
    const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  }

  function tituloRango() {
    if (vista === "mes") return format(fecha, "MMMM yyyy", { locale: es });
    if (vista === "dia") return format(fecha, "EEEE d 'de' MMMM", { locale: es });
    const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
    return `${format(inicio, "d MMM", { locale: es })} - ${format(addDays(inicio, 6), "d MMM yyyy", { locale: es })}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
          <p className="text-sm capitalize text-slate-500">{tituloRango()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={enviarRecordatorios} disabled={enviandoRecordatorios}>
            {enviandoRecordatorios ? "Enviando..." : "✉️ Enviar recordatorios pendientes"}
          </Button>
          <Button variant="secondary" onClick={() => setRecurrenteModalOpen(true)}>
            + Paquete de sesiones
          </Button>
          <Button
            onClick={() => {
              setSlotSeleccionado(undefined);
              setCitaModalOpen(true);
            }}
          >
            + Nueva cita
          </Button>
        </div>
      </div>

      {mensajeRecordatorios && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {mensajeRecordatorios}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navegar(-1)}>
            ←
          </Button>
          <Button variant="secondary" onClick={() => setFecha(new Date())}>
            Hoy
          </Button>
          <Button variant="secondary" onClick={() => navegar(1)}>
            →
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} className="w-56">
            <option value="">Todos los profesionales</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </Select>
          <div className="flex rounded-lg border border-slate-200 p-1">
            {(["dia", "semana", "mes"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-md px-3 py-1 text-sm capitalize ${
                  vista === v ? "bg-lily-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {vista === "mes" ? (
          <MonthView
            mes={fecha}
            citas={citas}
            onDiaClick={(dia) => {
              setFecha(dia);
              setVista("dia");
            }}
          />
        ) : (
          <TimeGridView
            dias={diasVisibles()}
            citas={citas}
            bloqueos={bloqueos}
            onSlotClick={(f) => {
              setSlotSeleccionado(f);
              setCitaModalOpen(true);
            }}
            onCitaClick={setCitaSeleccionada}
          />
        )}
      </div>

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
      />
      <CitaDetailModal cita={citaSeleccionada} onClose={() => setCitaSeleccionada(null)} onUpdated={cargar} />
    </div>
  );
}
