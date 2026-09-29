import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { escalaLimpia, formatoMonto } from "../formato";

// Color de serie (paleta categórica validada, slot 1). Una sola serie por
// gráfica: no lleva leyenda, el título la nombra.
export const COLOR_BARRA = "#2a78d6";

function fechaDeClave(clave: string) {
  const [y, m, d] = clave.split("-").map(Number);
  return new Date(y, m - 1, d ?? 1);
}

function montoCorto(v: number) {
  return v >= 1000 ? `$${(v / 1000).toLocaleString("es-VE", { maximumFractionDigits: 1 })}k` : `$${v}`;
}

/** Cobros por día o por mes; cada barra muestra su valor al pasar el ratón o con el foco. */
export function BarrasTiempo({
  puntos,
  granularidad,
}: {
  puntos: { fecha: string; total: string }[];
  granularidad: "dia" | "mes";
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const valores = puntos.map((p) => Number(p.total));
  const { tope, ticks } = escalaLimpia(Math.max(...valores, 0));
  if (valores.every((v) => v === 0)) {
    return <p className="py-10 text-center text-sm text-slate-500">No hubo cobros en este período.</p>;
  }
  const etiqueta = (p: { fecha: string }) =>
    format(fechaDeClave(p.fecha), granularidad === "dia" ? "EEE d MMM" : "MMMM yyyy", { locale: es });
  // Rotula ~6 fechas en el eje para que no se amontonen.
  const cadaCuanto = Math.max(1, Math.ceil(puntos.length / 6));

  return (
    <div className="flex gap-2 pt-3">
      <div className="relative h-48 w-12 shrink-0 text-right text-xs text-slate-400" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / tope) * 100}%` }}>
            {montoCorto(t)}
          </span>
        ))}
      </div>
      <div className="flex-1">
        <div className="relative h-48">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-slate-100" style={{ bottom: `${(t / tope) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label="Cobros del período">
            {puntos.map((p, i) => {
              const v = valores[i];
              return (
                <div
                  key={p.fecha}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${etiqueta(p)}: ${formatoMonto(v)}`}
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  className="relative flex h-full flex-1 cursor-default items-end outline-none"
                >
                  <div
                    className="w-full rounded-t-[4px] transition-opacity"
                    style={{
                      height: v > 0 ? `max(2px, ${(v / tope) * 100}%)` : 0,
                      background: COLOR_BARRA,
                      opacity: activo === null || activo === i ? 1 : 0.45,
                    }}
                  />
                  {activo === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-md">
                      <span className="font-semibold text-slate-900">{formatoMonto(v)}</span>{" "}
                      <span className="capitalize text-slate-500">{etiqueta(p)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1 flex gap-[2px] text-[10px] text-slate-400" aria-hidden="true">
          {puntos.map((p, i) => (
            <span key={p.fecha} className="flex-1 truncate text-center capitalize">
              {i % cadaCuanto === 0
                ? format(fechaDeClave(p.fecha), granularidad === "dia" ? "d MMM" : "MMM", { locale: es })
                : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Ranking con barra proporcional y el valor escrito al lado (no depende del color ni del ratón). */
export function BarrasHorizontales({
  filas,
  vacio = "Sin datos en este período.",
}: {
  filas: { etiqueta: string; valor: number; texto: string; detalle?: string }[];
  vacio?: string;
}) {
  if (filas.length === 0 || filas.every((f) => f.valor === 0)) {
    return <p className="py-4 text-sm text-slate-500">{vacio}</p>;
  }
  const max = Math.max(...filas.map((f) => f.valor));
  return (
    <ul className="flex flex-col gap-2.5">
      {filas.map((f) => (
        <li key={f.etiqueta} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-slate-700">{f.etiqueta}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-slate-900">{f.texto}</span>
              {f.detalle && <span className="ml-1.5 text-xs text-slate-500">{f.detalle}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full"
              style={{ width: `${max ? (f.valor / max) * 100 : 0}%`, minWidth: f.valor > 0 ? 4 : 0, background: COLOR_BARRA }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
