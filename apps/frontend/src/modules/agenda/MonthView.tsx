import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { Cita } from "../../types";

export function MonthView({
  mes,
  citas,
  onDiaClick,
}: {
  mes: Date;
  citas: Cita[];
  onDiaClick: (dia: Date) => void;
}) {
  const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
  const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
  const dias = eachDayOfInterval({ start: inicio, end: fin });
  const hoy = new Date();

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
      {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
        <div key={d} className="bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-500">
          {d}
        </div>
      ))}
      {dias.map((dia) => {
        const citasDia = citas.filter((c) => isSameDay(new Date(c.fechaHoraInicio), dia));
        return (
          <button
            key={dia.toISOString()}
            onClick={() => onDiaClick(dia)}
            className={clsx(
              "flex min-h-[84px] flex-col items-start gap-1 bg-white p-2 text-left hover:bg-lily-blue-50",
              !isSameMonth(dia, mes) && "bg-slate-50 text-slate-400"
            )}
          >
            <span
              className={clsx(
                "text-xs font-medium",
                isSameDay(dia, hoy) && "flex h-5 w-5 items-center justify-center rounded-full bg-lily-blue-600 text-white"
              )}
            >
              {format(dia, "d", { locale: es })}
            </span>
            {citasDia.length > 0 && (
              <span className="rounded-full bg-lily-green-100 px-2 py-0.5 text-[10px] font-medium text-lily-green-700">
                {citasDia.length} cita{citasDia.length > 1 ? "s" : ""}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
