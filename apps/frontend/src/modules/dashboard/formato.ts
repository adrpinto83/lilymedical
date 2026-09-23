export function formatoMonto(valor: number | string): string {
  return `$${Number(valor).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Variación contra el mismo período del mes anterior; null si no hay base
// con la que comparar (evita mostrar "+∞%").
export function variacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

export function escalaLimpia(max: number, divisiones = 3): { tope: number; ticks: number[] } {
  if (max <= 0) return { tope: 1, ticks: [0] };
  const bruto = max / divisiones;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * magnitud).find((p) => p >= bruto) ?? 10 * magnitud;
  const tope = paso * Math.ceil(max / paso);
  const ticks: number[] = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) ticks.push(v);
  return { tope, ticks };
}
