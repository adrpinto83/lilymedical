import { Cita, EstadoCita } from "../../types";

export const ESTADOS_CITA: EstadoCita[] = ["PROGRAMADA", "CONFIRMADA", "ATENDIDA", "NO_ASISTIO", "CANCELADA"];

export const ESTADO_CITA: Record<
  EstadoCita,
  { label: string; bloque: string; punto: string; badge: "blue" | "green" | "slate" | "amber" | "red" }
> = {
  PROGRAMADA: {
    label: "Programada",
    bloque: "bg-lily-blue-100 border-lily-blue-400 text-lily-blue-900",
    punto: "bg-lily-blue-500",
    badge: "blue",
  },
  CONFIRMADA: {
    label: "Confirmada",
    bloque: "bg-lily-green-100 border-lily-green-400 text-lily-green-900",
    punto: "bg-lily-green-500",
    badge: "green",
  },
  ATENDIDA: {
    label: "Atendida",
    bloque: "bg-slate-100 border-slate-400 text-slate-700",
    punto: "bg-slate-400",
    badge: "slate",
  },
  NO_ASISTIO: {
    label: "No asistió",
    bloque: "bg-amber-50 border-amber-300 text-amber-700",
    punto: "bg-amber-400",
    badge: "amber",
  },
  CANCELADA: {
    label: "Cancelada",
    bloque: "bg-red-50 border-red-300 text-red-500 line-through opacity-70",
    punto: "bg-red-400",
    badge: "red",
  },
};

/** Estados desde los que la cita todavía se puede confirmar, atender, etc. */
export function citaPendiente(estado: EstadoCita) {
  return estado === "PROGRAMADA" || estado === "CONFIRMADA";
}

export function nombrePaciente(cita: Cita) {
  return cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombres}` : "Paciente";
}

/**
 * Enlace de WhatsApp a partir de un teléfono venezolano tal como se registra
 * en la ficha ("0414-1234567", "+58 414 1234567", "4141234567"...).
 */
export function enlaceWhatsApp(telefono: string | undefined | null, mensaje?: string) {
  if (!telefono) return null;
  let digitos = telefono.replace(/\D/g, "");
  if (digitos.startsWith("58")) digitos = digitos.slice(2);
  if (digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length !== 10) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/58${digitos}${texto}`;
}

/**
 * Reparte en columnas las citas que se solapan en un mismo día para que se
 * vean lado a lado en la grilla en lugar de taparse unas a otras. Devuelve,
 * por id, la columna de la cita y cuántas columnas tiene su grupo de solape.
 */
export function distribuirSolapes<T extends { id: string; fechaHoraInicio: string; fechaHoraFin: string }>(
  eventos: T[]
): Map<string, { columna: number; columnas: number }> {
  const ordenados = [...eventos].sort(
    (a, b) =>
      new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime() ||
      new Date(b.fechaHoraFin).getTime() - new Date(a.fechaHoraFin).getTime()
  );
  const resultado = new Map<string, { columna: number; columnas: number }>();

  let grupo: T[] = [];
  let finColumnas: number[] = [];
  let finGrupo = -Infinity;

  const cerrarGrupo = () => {
    for (const e of grupo) resultado.get(e.id)!.columnas = finColumnas.length;
    grupo = [];
    finColumnas = [];
  };

  for (const e of ordenados) {
    const inicio = new Date(e.fechaHoraInicio).getTime();
    const fin = new Date(e.fechaHoraFin).getTime();
    if (inicio >= finGrupo) cerrarGrupo();

    let columna = finColumnas.findIndex((f) => f <= inicio);
    if (columna === -1) {
      columna = finColumnas.length;
      finColumnas.push(fin);
    } else {
      finColumnas[columna] = fin;
    }
    resultado.set(e.id, { columna, columnas: 1 });
    grupo.push(e);
    finGrupo = Math.max(finGrupo, fin);
  }
  cerrarGrupo();

  return resultado;
}
