import type { EstadoEquipo, TipoMantenimiento } from "../../services/equipos";

type Color = "slate" | "blue" | "green" | "amber" | "red";

export const CATEGORIAS_EQUIPO = [
  "Electroterapia",
  "Ultrasonido",
  "Láser",
  "Magnetoterapia",
  "Tracción",
  "Termoterapia / Crioterapia",
  "Ondas de choque",
  "Mecanoterapia",
  "Otro",
];

export const estadoEquipoLabel: Record<EstadoEquipo, string> = {
  OPERATIVO: "Operativo",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_DE_SERVICIO: "Fuera de servicio",
  DADO_DE_BAJA: "Dado de baja",
};

export const estadoEquipoColor: Record<EstadoEquipo, Color> = {
  OPERATIVO: "green",
  EN_MANTENIMIENTO: "amber",
  FUERA_DE_SERVICIO: "red",
  DADO_DE_BAJA: "slate",
};

export const tipoMantenimientoLabel: Record<TipoMantenimiento, string> = {
  PREVENTIVO: "Preventivo",
  CORRECTIVO: "Correctivo (reparación)",
  CALIBRACION: "Calibración",
};

// Las fechas vienen como medianoche UTC (ver equipos.service); se leen como
// fecha de calendario para no correrlas un día en UTC-4.
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function aInputFecha(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export function hoyInputFecha(): string {
  const hoy = new Date();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mm}-${dd}`;
}

export function diasRestantes(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const hoy = new Date();
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - hoyUtc) / (24 * 60 * 60 * 1000));
}

export function alertaMantenimiento(
  proximo: string | null,
  diasAviso = 15
): { texto: string; color: Color } {
  if (!proximo) return { texto: "Sin plan", color: "slate" };
  const dias = diasRestantes(proximo);
  if (dias < 0) return { texto: `Vencido hace ${-dias} d`, color: "red" };
  if (dias === 0) return { texto: "Vence hoy", color: "amber" };
  if (dias <= diasAviso) return { texto: `En ${dias} d`, color: "amber" };
  return { texto: fechaCorta(proximo), color: "green" };
}
