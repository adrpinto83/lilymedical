import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { escalaLimpia, formatoMonto } from "./formato";

function fechaDeMes(mes: string): Date {
  const [y, m] = mes.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function montoCorto(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toLocaleString("es-VE", { maximumFractionDigits: 1 })}k` : `$${v}`;
}

export function IngresosChart({ datos }: { datos: { mes: string; total: string }[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const valores = datos.map((d) => Number(d.total));
  const { tope, ticks } = escalaLimpia(Math.max(...valores, 0));
  const ultimo = datos.length - 1;

  if (valores.every((v) => v === 0)) {
    return <p className="py-8 text-center text-sm text-slate-500">Aún no hay pagos registrados en estos meses.</p>;
  }

  return (
    <div className="pt-3">
      <div className="flex gap-2">
        <div className="relative h-44 w-12 shrink-0 text-right text-xs text-slate-400" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / tope) * 100}%` }}>
              {montoCorto(t)}
            </span>
          ))}
        </div>

        <div className="relative h-44 flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-slate-100"
              style={{ bottom: `${(t / tope) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <div className="absolute inset-0 flex" onMouseLeave={() => setActivo(null)}>
            {datos.map((d, i) => {
              const valor = valores[i];
              const altura = (valor / tope) * 100;
              const etiqueta = `${format(fechaDeMes(d.mes), "LLLL yyyy", { locale: es })}${i === ultimo ? " (en curso)" : ""}`;
              return (
                <div
                  key={d.mes}
                  tabIndex={0}
                  aria-label={`${etiqueta}: ${formatoMonto(valor)}`}
                  onMouseEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  className="relative flex flex-1 cursor-default items-end justify-center rounded-md outline-none hover:bg-slate-50 focus-visible:bg-slate-50"
                >
                  {i === ultimo && valor > 0 && (
                    <span
                      className="absolute pb-1 text-xs font-medium text-slate-700"
                      style={{ bottom: `${altura}%` }}
                    >
                      {montoCorto(valor)}
                    </span>
                  )}
                  <div className="w-6 rounded-t bg-lily-pink-500" style={{ height: `${altura}%` }} />

                  {activo === i && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
                      style={{ bottom: `calc(${altura}% + 8px)` }}
                    >
                      <p className="capitalize text-slate-500">{etiqueta}</p>
                      <p className="font-semibold text-slate-900">{formatoMonto(valor)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ml-14 flex" aria-hidden="true">
        {datos.map((d, i) => (
          <span key={d.mes} className="flex-1 pt-2 text-center text-xs capitalize text-slate-500">
            {format(fechaDeMes(d.mes), "LLL", { locale: es }).replace(".", "")}
            {i === ultimo && <span className="block text-[10px] normal-case text-slate-400">en curso</span>}
          </span>
        ))}
      </div>

      <div className="sr-only">
      <table>
        <caption>Ingresos cobrados por mes</caption>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d, i) => (
            <tr key={d.mes}>
              <td>{format(fechaDeMes(d.mes), "LLLL yyyy", { locale: es })}</td>
              <td>{formatoMonto(valores[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
