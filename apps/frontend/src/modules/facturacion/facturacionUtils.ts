import { EstadoFactura, MetodoPago } from "../../types";

export const METODO_PAGO: Record<MetodoPago, { label: string; enBs: boolean; pideReferencia: boolean }> = {
  EFECTIVO: { label: "Efectivo", enBs: false, pideReferencia: false },
  PAGO_MOVIL: { label: "Pago móvil", enBs: true, pideReferencia: true },
  TRANSFERENCIA: { label: "Transferencia", enBs: false, pideReferencia: true },
  TARJETA: { label: "Tarjeta (punto de venta)", enBs: false, pideReferencia: true },
  ZELLE: { label: "Zelle", enBs: false, pideReferencia: true },
  SEGURO: { label: "Seguro", enBs: false, pideReferencia: true },
};

export const METODOS_PAGO = Object.keys(METODO_PAGO) as MetodoPago[];

export const ESTADO_FACTURA: Record<EstadoFactura, { label: string; color: "amber" | "green" | "blue" | "red" }> = {
  PENDIENTE: { label: "Pendiente", color: "amber" },
  PARCIAL: { label: "Pago parcial", color: "blue" },
  PAGADA: { label: "Pagada", color: "green" },
  ANULADA: { label: "Anulada", color: "red" },
};

const formatoNumero = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const usd = (v: string | number | null | undefined) => `$${formatoNumero(Number(v ?? 0))}`;
export const bs = (v: string | number | null | undefined) => `Bs ${formatoNumero(Number(v ?? 0))}`;

export const redondear2 = (n: number) => Math.round(n * 100) / 100;

/** Mismo cálculo que el backend al emitir: sirve para mostrar el reparto antes de crear. */
export function calcularSplit(
  total: number,
  aseguradora: { porcentajeCobertura?: number | null; topeMontoPorSesion?: string | null } | null,
  unidades: number
): { aseguradora: number | null; paciente: number } {
  if (!aseguradora) return { aseguradora: null, paciente: total };
  let cubre =
    aseguradora.porcentajeCobertura == null ? total : redondear2((total * aseguradora.porcentajeCobertura) / 100);
  if (aseguradora.topeMontoPorSesion != null) cubre = Math.min(cubre, Number(aseguradora.topeMontoPorSesion) * unidades);
  return { aseguradora: cubre, paciente: redondear2(total - cubre) };
}

// La tasa del día se recuerda en este navegador para no reescribirla en cada cobro.
const CLAVE_TASA = "lilymedical_tasa_bs";

export function tasaGuardada(): string {
  try {
    const raw = localStorage.getItem(CLAVE_TASA);
    if (!raw) return "";
    const { tasa, fecha } = JSON.parse(raw) as { tasa: string; fecha: string };
    return fecha === new Date().toDateString() ? tasa : "";
  } catch {
    return "";
  }
}

export function guardarTasa(tasa: string) {
  try {
    localStorage.setItem(CLAVE_TASA, JSON.stringify({ tasa, fecha: new Date().toDateString() }));
  } catch {
    // sin almacenamiento: se vuelve a escribir la próxima vez
  }
}
