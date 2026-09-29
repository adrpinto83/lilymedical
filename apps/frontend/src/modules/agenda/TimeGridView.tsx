import { useEffect, useState } from "react";
import { Cita, BloqueoHorario } from "../../types";
import { format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { ESTADO_CITA, distribuirSolapes, nombrePaciente } from "./agendaUtils";

// Horario que se muestra siempre; se amplía si hay citas o bloqueos fuera de él.
const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_HEIGHT = 56; // px
const SLOT_MINUTES = 15;

function rangoHoras(citas: Cita[], bloqueos: BloqueoHorario[]): [number, number] {
  let inicio = START_HOUR;
  let fin = END_HOUR;
  for (const e of [...citas, ...bloqueos]) {
    const desde = new Date(e.fechaHoraInicio);
    const hasta = new Date(e.fechaHoraFin);
    inicio = Math.min(inicio, desde.getHours());
    fin = Math.max(fin, hasta.getHours() + (hasta.getMinutes() > 0 ? 1 : 0));
  }
  return [inicio, Math.min(fin, 24)];
}

export function TimeGridView({
  dias,
  citas,
  bloqueos,
  mostrarProfesional,
  onSlotClick,
  onCitaClick,
  onBloqueoClick,
}: {
  dias: Date[];
  citas: Cita[];
  bloqueos: BloqueoHorario[];
  mostrarProfesional: boolean;
  /** Sin handler (p. ej. el fisiatra ayudante) los huecos no son clicables. */
  onSlotClick?: (fecha: Date) => void;
  onCitaClick: (cita: Cita) => void;
  onBloqueoClick?: (bloqueo: BloqueoHorario) => void;
}) {
  const [horaInicio, horaFin] = rangoHoras(citas, bloqueos);
  const horas = Array.from({ length: horaFin - horaInicio }, (_, i) => horaInicio + i);
  const [ahora, setAhora] = useState(new Date());
  const [hover, setHover] = useState<{ dia: string; minutos: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const minutosDesdeInicio = (d: Date) => (d.getHours() - horaInicio) * 60 + d.getMinutes();
  const posicion = (desde: Date, hasta: Date, minimo: number) => {
    const top = (minutosDesdeInicio(desde) / 60) * HOUR_HEIGHT;
    const height = (minutosDesdeInicio(hasta) / 60) * HOUR_HEIGHT - top;
    return { top, height: Math.max(height, minimo) };
  };

  function minutosEnPunto(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutos = Math.floor(((e.clientY - rect.top) / HOUR_HEIGHT) * 60);
    return Math.max(0, minutos - (minutos % SLOT_MINUTES));
  }

  function fechaDeSlot(dia: Date, minutos: number) {
    const fecha = new Date(dia);
    fecha.setHours(horaInicio, minutos, 0, 0);
    return fecha;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px]">
        <div className="w-14 shrink-0">
          <div className="h-12" />
          {horas.map((h) => (
            <div key={h} className="relative text-right text-xs text-slate-400" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute -top-2 right-2">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {dias.map((dia) => {
          const claveDia = dia.toDateString();
          const citasDia = citas.filter((c) => isSameDay(new Date(c.fechaHoraInicio), dia));
          const bloqueosDia = bloqueos.filter((b) => isSameDay(new Date(b.fechaHoraInicio), dia));
          const columnas = distribuirSolapes(citasDia);
          const hoy = isToday(dia);
          const activas = citasDia.filter((c) => c.estado !== "CANCELADA").length;
          const hoverAqui = hover?.dia === claveDia ? hover.minutos : null;

          return (
            <div key={claveDia} className={clsx("flex-1 border-l border-slate-100", hoy && "bg-lily-blue-50/40")}>
              <div
                className={clsx(
                  "sticky top-0 z-10 flex h-12 flex-col items-center justify-center border-b border-slate-200 bg-white text-xs",
                  hoy ? "font-semibold text-lily-blue-700" : "font-medium text-slate-600"
                )}
              >
                <span className="capitalize">
                  {hoy ? (
                    <>
                      {format(dia, "EEE", { locale: es })}{" "}
                      <span className="rounded-full bg-lily-blue-600 px-1.5 py-0.5 text-white">{format(dia, "d")}</span>
                    </>
                  ) : (
                    format(dia, "EEE d", { locale: es })
                  )}
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  {activas > 0 ? `${activas} cita${activas > 1 ? "s" : ""}` : "Libre"}
                </span>
              </div>
              <div
                className={clsx("relative", onSlotClick && "cursor-pointer")}
                style={{ height: horas.length * HOUR_HEIGHT }}
                onMouseMove={(e) => onSlotClick && setHover({ dia: claveDia, minutos: minutosEnPunto(e) })}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => onSlotClick?.(fechaDeSlot(dia, minutosEnPunto(e)))}
              >
                {horas.map((h) => (
                  <div key={h} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }}>
                    <div className="border-b border-dashed border-slate-50" style={{ height: HOUR_HEIGHT / 2 }} />
                  </div>
                ))}

                {hoverAqui !== null && (
                  <div
                    className="pointer-events-none absolute left-1 right-1 rounded-md border border-dashed border-lily-blue-400 bg-lily-blue-50 px-2 text-[11px] text-lily-blue-700"
                    style={{ top: (hoverAqui / 60) * HOUR_HEIGHT, height: (SLOT_MINUTES / 60) * HOUR_HEIGHT }}
                  >
                    + {format(fechaDeSlot(dia, hoverAqui), "HH:mm")}
                  </div>
                )}

                {bloqueosDia.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    title={onBloqueoClick ? "Clic para quitar el bloqueo" : undefined}
                    disabled={!onBloqueoClick}
                    onMouseMove={(e) => e.stopPropagation()}
                    onMouseEnter={() => setHover(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBloqueoClick?.(b);
                    }}
                    className="absolute left-0.5 right-0.5 overflow-hidden rounded-md border border-dashed border-slate-300 bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_6px,#e2e8f0_6px,#e2e8f0_12px)] px-2 py-1 text-left text-[11px] text-slate-600 enabled:hover:border-slate-400"
                    style={posicion(new Date(b.fechaHoraInicio), new Date(b.fechaHoraFin), 20)}
                  >
                    🚫 {b.motivo || "Bloqueado"}
                  </button>
                ))}

                {citasDia.map((c) => {
                  const desde = new Date(c.fechaHoraInicio);
                  const hasta = new Date(c.fechaHoraFin);
                  const { columna, columnas: total } = columnas.get(c.id)!;
                  const ancho = 100 / total;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      title={`${nombrePaciente(c)} · ${format(desde, "HH:mm")}–${format(hasta, "HH:mm")} · ${ESTADO_CITA[c.estado].label}`}
                      onMouseMove={(e) => e.stopPropagation()}
                      onMouseEnter={() => setHover(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCitaClick(c);
                      }}
                      className={clsx(
                        "absolute overflow-hidden rounded-md border-l-4 border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm transition hover:z-20 hover:shadow-md",
                        ESTADO_CITA[c.estado].bloque
                      )}
                      style={{
                        ...posicion(desde, hasta, 22),
                        left: `calc(${columna * ancho}% + 2px)`,
                        width: `calc(${ancho}% - 4px)`,
                      }}
                    >
                      <p className="truncate font-semibold">{nombrePaciente(c)}</p>
                      <p className="truncate">
                        {format(desde, "HH:mm")}–{format(hasta, "HH:mm")} · {c.tarifa?.nombreServicio ?? "Consulta"}
                      </p>
                      {(mostrarProfesional || c.esRecurrente) && (
                        <p className="truncate opacity-80">
                          {mostrarProfesional && c.profesional && `${c.profesional.nombre} ${c.profesional.apellido}`}
                          {mostrarProfesional && c.esRecurrente && " · "}
                          {c.esRecurrente && `Sesión ${c.numeroSesionEnGrupo}/${c.totalSesionesGrupo}`}
                        </p>
                      )}
                    </button>
                  );
                })}

                {hoy && ahora.getHours() >= horaInicio && ahora.getHours() < horaFin && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-30 border-t-2 border-red-500"
                    style={{ top: (minutosDesdeInicio(ahora) / 60) * HOUR_HEIGHT }}
                  >
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
