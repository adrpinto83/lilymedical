import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface SerieEvolucion {
  nombre: string;
  color: string;
  puntos: { fecha: Date; valor: number }[];
}

// Colores de serie (paleta categórica validada: slots 1 y 2).
export const COLOR_SERIE = ["#2a78d6", "#eb6834"];

const ALTO = 150;
const M = { arriba: 12, derecha: 36, abajo: 22, izquierda: 30 };

export function GraficoEvolucion({
  titulo,
  series,
  yMax,
  sufijo = "",
  mejorEsMenor,
}: {
  titulo: string;
  series: SerieEvolucion[];
  yMax: number;
  sufijo?: string;
  /** EVA y Oswestry mejoran al bajar; Barthel al subir. Sin definir: no se juzga. */
  mejorEsMenor?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(220, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const fechas = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.fecha.getTime())))].sort((a, b) => a - b);
  const t0 = fechas[0];
  const t1 = fechas[fechas.length - 1];
  const x = (t: number) =>
    M.izquierda + (t1 === t0 ? (ancho - M.izquierda - M.derecha) / 2 : ((t - t0) / (t1 - t0)) * (ancho - M.izquierda - M.derecha));
  const y = (v: number) => M.arriba + (1 - v / yMax) * (ALTO - M.arriba - M.abajo);
  const ticks = [0, yMax / 2, yMax];

  // Titular: primer y último valor de la serie principal.
  const principal = series.find((s) => s.puntos.length > 0) ?? series[0];
  const primero = principal.puntos[0]?.valor;
  const ultimo = principal.puntos[principal.puntos.length - 1]?.valor;
  const delta = ultimo - primero;
  const tendencia =
    delta === 0
      ? "sin cambios"
      : mejorEsMenor === undefined
        ? `${delta > 0 ? "+" : ""}${delta}${sufijo}`
        : (mejorEsMenor ? delta < 0 : delta > 0)
          ? "▲ mejoría"
          : "▼ empeoró";

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let mejor = 0;
    fechas.forEach((t, i) => {
      if (Math.abs(x(t) - px) < Math.abs(x(fechas[mejor]) - px)) mejor = i;
    });
    setHover(mejor);
  }

  const tHover = hover !== null ? fechas[hover] : null;

  return (
    <figure className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">{titulo}</span>
        {principal.puntos.length >= 2 && (
          <span className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">
              {primero}
              {sufijo} → {ultimo}
              {sufijo}
            </span>{" "}
            {tendencia}
          </span>
        )}
      </figcaption>

      {series.length > 1 && (
        <div className="flex gap-3 text-[11px] text-slate-600">
          {series.map((s) => (
            <span key={s.nombre} className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />
              {s.nombre}
            </span>
          ))}
        </div>
      )}

      <div ref={ref} className="relative">
        <svg
          width={ancho}
          height={ALTO}
          role="img"
          aria-label={`${titulo}: evolución`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-none"
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.izquierda} x2={ancho - M.derecha} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={M.izquierda - 6} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">
                {v}
              </text>
            </g>
          ))}
          <text x={M.izquierda} y={ALTO - 6} fontSize={10} fill="#94a3b8">
            {format(t0, "d MMM", { locale: es })}
          </text>
          {t1 !== t0 && (
            <text x={ancho - M.derecha} y={ALTO - 6} textAnchor="end" fontSize={10} fill="#94a3b8">
              {format(t1, "d MMM", { locale: es })}
            </text>
          )}

          {tHover !== null && (
            <line x1={x(tHover)} x2={x(tHover)} y1={M.arriba} y2={ALTO - M.abajo} stroke="#94a3b8" strokeWidth={1} />
          )}

          {series.map((s) => {
            const d = s.puntos.map((p, i) => `${i ? "L" : "M"}${x(p.fecha.getTime())},${y(p.valor)}`).join(" ");
            const ult = s.puntos[s.puntos.length - 1];
            return (
              <g key={s.nombre}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {s.puntos.map((p, i) => (
                  <circle
                    key={i}
                    cx={x(p.fecha.getTime())}
                    cy={y(p.valor)}
                    r={p.fecha.getTime() === tHover ? 5 : 4}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
                {ult && (
                  <text
                    x={x(ult.fecha.getTime()) + 8}
                    y={y(ult.valor) + 4}
                    fontSize={11}
                    fontWeight={600}
                    fill="#334155"
                  >
                    {ult.valor}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {tHover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-md"
            style={{
              left: Math.min(x(tHover) + 8, ancho - 130),
            }}
          >
            <p className="text-slate-500">{format(tHover, "d MMM yyyy", { locale: es })}</p>
            {series.map((s) => {
              const p = s.puntos.find((q) => q.fecha.getTime() === tHover);
              if (!p) return null;
              return (
                <p key={s.nombre} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />
                  <span className="font-semibold text-slate-900">
                    {p.valor}
                    {sufijo}
                  </span>
                  <span className="text-slate-500">{s.nombre}</span>
                </p>
              );
            })}
          </div>
        )}
      </div>

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer text-slate-400">Ver datos</summary>
        <table className="mt-1 w-full">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="font-medium">Fecha</th>
              {series.map((s) => (
                <th key={s.nombre} className="text-right font-medium">
                  {s.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fechas.map((t) => (
              <tr key={t}>
                <td>{format(t, "dd/MM/yyyy")}</td>
                {series.map((s) => (
                  <td key={s.nombre} className="text-right tabular-nums">
                    {s.puntos.find((p) => p.fecha.getTime() === t)?.valor ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
