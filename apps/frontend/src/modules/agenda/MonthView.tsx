import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { Cita, BloqueoHorario } from "../../types";
import { ESTADO_CITA } from "./agendaUtils";

const MAX_CITAS_POR_DIA = 3;

export function MonthView({
  mes,
  citas,
  bloqueos,
  onDiaClick,
  onCitaClick,
}: {
  mes: Date;
  citas: Cita[];
  bloqueos: BloqueoHorario[];
  onDiaClick: (dia: Date) => void;
  onCitaClick: (cita: Cita) => void;
}) {
  const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
  const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
  const dias = eachDayOfInterval({ start: inicio, end: fin });

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-500">
            {d}
          </div>
        ))}
        {dias.map((dia) => {
          const citasDia = citas.filter((c) => isSameDay(new Date(c.fechaHoraInicio), dia));
          const tieneBloqueo = bloqueos.some((b) => isSameDay(new Date(b.fechaHoraInicio), dia));
          const visibles = citasDia.slice(0, MAX_CITAS_POR_DIA);
          const resto = citasDia.length - visibles.length;
          return (
            <div
              key={dia.toISOString()}
              role="button"
              tabIndex={0}
              title="Ver el día"
              onClick={() => onDiaClick(dia)}
              onKeyDown={(e) => e.key === "Enter" && onDiaClick(dia)}
              className={clsx(
                "flex min-h-[104px] cursor-pointer flex-col gap-1 p-1.5 text-left hover:bg-lily-blue-50",
                isSameMonth(dia, mes) ? "bg-white" : "bg-slate-50 text-slate-400"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    "text-xs font-medium",
                    isToday(dia) && "flex h-5 w-5 items-center justify-center rounded-full bg-lily-blue-600 text-white"
                  )}
                >
                  {format(dia, "d", { locale: es })}
                </span>
                {tieneBloqueo && (
                  <span className="text-[10px] text-slate-400" title="Hay horario bloqueado este día">
                    🚫
                  </span>
                )}
              </div>
              {visibles.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCitaClick(c);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-1 truncate rounded px-1 text-left text-[11px] text-slate-700 hover:bg-slate-100",
                    c.estado === "CANCELADA" && "text-slate-400 line-through"
                  )}
                >
                  <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", ESTADO_CITA[c.estado].punto)} />
                  <span className="font-medium">{format(new Date(c.fechaHoraInicio), "HH:mm")}</span>
                  <span className="truncate">{c.paciente?.apellidos}</span>
                </button>
              ))}
              {resto > 0 && <span className="px-1 text-[11px] font-medium text-lily-blue-700">+{resto} más</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
