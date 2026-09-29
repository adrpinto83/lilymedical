import { format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { Cita, EstadoCita } from "../../types";
import { Badge } from "../../components/ui/Badge";
import { ESTADO_CITA, citaPendiente, enlaceWhatsApp, nombrePaciente } from "./agendaUtils";

export function mensajeRecordatorio(cita: Cita) {
  const inicio = new Date(cita.fechaHoraInicio);
  return (
    `Hola ${cita.paciente?.nombres ?? ""}, le recordamos su cita en LilyMedical el ` +
    `${format(inicio, "EEEE d 'de' MMMM", { locale: es })} a las ${format(inicio, "h:mm a")}. ` +
    "Por favor confirme su asistencia."
  );
}

export function ListView({
  dias,
  citas,
  mostrarProfesional,
  actualizando,
  onCitaClick,
  onCambiarEstado,
}: {
  dias: Date[];
  citas: Cita[];
  mostrarProfesional: boolean;
  /** Id de la cita cuyo estado se está guardando. */
  actualizando: string | null;
  onCitaClick: (cita: Cita) => void;
  /** Sin handler (p. ej. el fisiatra ayudante) la lista es de solo lectura. */
  onCambiarEstado?: (cita: Cita, estado: EstadoCita) => void;
}) {
  const diasConCitas = dias
    .map((dia) => ({ dia, citas: citas.filter((c) => isSameDay(new Date(c.fechaHoraInicio), dia)) }))
    .filter((d) => d.citas.length > 0);

  if (diasConCitas.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No hay citas en este rango.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {diasConCitas.map(({ dia, citas: citasDia }) => (
        <section key={dia.toDateString()}>
          <h3
            className={clsx(
              "mb-2 text-sm font-semibold capitalize",
              isToday(dia) ? "text-lily-blue-700" : "text-slate-700"
            )}
          >
            {isToday(dia) && "Hoy · "}
            {format(dia, "EEEE d 'de' MMMM", { locale: es })}
            <span className="ml-2 font-normal normal-case text-slate-400">
              {citasDia.length} cita{citasDia.length > 1 ? "s" : ""}
            </span>
          </h3>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {citasDia.map((c) => {
              const whatsapp = enlaceWhatsApp(c.paciente?.telefono, mensajeRecordatorio(c));
              const guardando = actualizando === c.id;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onCitaClick(c)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="w-24 shrink-0 text-sm tabular-nums text-slate-600">
                      {format(new Date(c.fechaHoraInicio), "HH:mm")}–{format(new Date(c.fechaHoraFin), "HH:mm")}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={clsx(
                          "block truncate text-sm font-medium",
                          c.estado === "CANCELADA" ? "text-slate-400 line-through" : "text-slate-900"
                        )}
                      >
                        {nombrePaciente(c)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {c.tarifa?.nombreServicio ?? "Consulta"}
                        {c.esRecurrente && ` · Sesión ${c.numeroSesionEnGrupo}/${c.totalSesionesGrupo}`}
                        {mostrarProfesional && c.profesional && ` · ${c.profesional.nombre} ${c.profesional.apellido}`}
                      </span>
                    </span>
                  </button>

                  <Badge color={ESTADO_CITA[c.estado].badge}>{ESTADO_CITA[c.estado].label}</Badge>

                  <div className="flex items-center gap-1">
                    {whatsapp && citaPendiente(c.estado) && (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        title="Enviar recordatorio por WhatsApp"
                        className="rounded-md px-2 py-1 text-xs text-lily-green-700 hover:bg-lily-green-50"
                      >
                        WhatsApp
                      </a>
                    )}
                    {onCambiarEstado && c.estado === "PROGRAMADA" && (
                      <AccionRapida disabled={guardando} onClick={() => onCambiarEstado(c, "CONFIRMADA")}>
                        Confirmar
                      </AccionRapida>
                    )}
                    {onCambiarEstado && citaPendiente(c.estado) && (
                      <>
                        <AccionRapida disabled={guardando} onClick={() => onCambiarEstado(c, "ATENDIDA")}>
                          Atendida
                        </AccionRapida>
                        <AccionRapida disabled={guardando} onClick={() => onCambiarEstado(c, "NO_ASISTIO")}>
                          No asistió
                        </AccionRapida>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AccionRapida({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
