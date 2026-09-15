import { Cita, BloqueoHorario } from "../../types";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_HEIGHT = 56; // px

const estadoColor: Record<string, string> = {
  PROGRAMADA: "bg-lily-blue-100 border-lily-blue-400 text-lily-blue-900",
  CONFIRMADA: "bg-lily-green-100 border-lily-green-400 text-lily-green-900",
  ATENDIDA: "bg-slate-100 border-slate-400 text-slate-700",
  CANCELADA: "bg-red-50 border-red-300 text-red-500 line-through",
  NO_ASISTIO: "bg-amber-50 border-amber-300 text-amber-700",
};

function minutesFromStart(date: Date) {
  return (date.getHours() - START_HOUR) * 60 + date.getMinutes();
}

export function TimeGridView({
  dias,
  citas,
  bloqueos,
  onSlotClick,
  onCitaClick,
}: {
  dias: Date[];
  citas: Cita[];
  bloqueos: BloqueoHorario[];
  onSlotClick: (fecha: Date) => void;
  onCitaClick: (cita: Cita) => void;
}) {
  const horas = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px]">
        <div className="w-14 shrink-0">
          <div className="h-10" />
          {horas.map((h) => (
            <div key={h} className="relative text-right text-xs text-slate-400" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute -top-2 right-2">{h}:00</span>
            </div>
          ))}
        </div>

        {dias.map((dia) => {
          const citasDia = citas.filter((c) => isSameDay(new Date(c.fechaHoraInicio), dia));
          const bloqueosDia = bloqueos.filter((b) => isSameDay(new Date(b.fechaHoraInicio), dia));

          return (
            <div key={dia.toISOString()} className="flex-1 border-l border-slate-100">
              <div className="sticky top-0 h-10 border-b border-slate-200 bg-white px-2 py-2 text-center text-xs font-medium text-slate-600">
                {format(dia, "EEE d", { locale: es })}
              </div>
              <div
                className="relative"
                style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minutos = Math.round((y / HOUR_HEIGHT) * 60);
                  const fecha = new Date(dia);
                  fecha.setHours(START_HOUR, 0, 0, 0);
                  fecha.setMinutes(fecha.getMinutes() + minutos - (minutos % 15));
                  onSlotClick(fecha);
                }}
              >
                {horas.map((h) => (
                  <div
                    key={h}
                    className="border-b border-slate-50"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {bloqueosDia.map((b) => {
                  const top = (minutesFromStart(new Date(b.fechaHoraInicio)) / 60) * HOUR_HEIGHT;
                  const height =
                    (minutesFromStart(new Date(b.fechaHoraFin)) / 60) * HOUR_HEIGHT - top;
                  return (
                    <div
                      key={b.id}
                      className="absolute left-1 right-1 rounded-md border border-dashed border-slate-300 bg-slate-100/70 px-2 py-1 text-[11px] text-slate-500"
                      style={{ top, height: Math.max(height, 20) }}
                    >
                      🚫 {b.motivo || "Bloqueado"}
                    </div>
                  );
                })}

                {citasDia.map((c) => {
                  const top = (minutesFromStart(new Date(c.fechaHoraInicio)) / 60) * HOUR_HEIGHT;
                  const height =
                    (minutesFromStart(new Date(c.fechaHoraFin)) / 60) * HOUR_HEIGHT - top;
                  return (
                    <button
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCitaClick(c);
                      }}
                      className={`absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] shadow-sm ${
                        estadoColor[c.estado] ?? "bg-slate-100 border-slate-300"
                      }`}
                      style={{ top, height: Math.max(height, 22) }}
                    >
                      <p className="truncate font-medium">
                        {c.paciente?.apellidos}, {c.paciente?.nombres}
                      </p>
                      <p className="truncate">
                        {format(new Date(c.fechaHoraInicio), "HH:mm")} · {c.tarifa?.nombreServicio ?? "Consulta"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
