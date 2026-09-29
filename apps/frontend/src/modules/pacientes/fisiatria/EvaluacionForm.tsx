import { FormEvent, useState } from "react";
import clsx from "clsx";
import { Button } from "../../../components/ui/Button";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { BodyDiagram, PuntoDolor } from "../../../components/clinical/BodyDiagram";
import { agregarEvaluacion } from "../../../services/historiasClinicas";
import { getErrorMessage } from "../../../services/api";
import {
  BARTHEL,
  CARACTER_DOLOR,
  ESCALAS,
  GONIOMETRIA,
  GRADOS_DANIELS,
  GRUPOS_MUSCULARES,
  ItemEscala,
  LADOS,
  Lado,
  MedicionFuerza,
  MedicionGoniometrica,
  OSWESTRY,
  TipoEscalaFisiatria,
  interpretarBarthel,
  interpretarEva,
  interpretarOswestry,
  porcentajeDelNormal,
  puntajeBarthel,
  puntajeOswestry,
} from "./escalas";

export function EvaluacionForm({ pacienteId, onSaved }: { pacienteId: string; onSaved: () => void }) {
  const [tipo, setTipo] = useState<TipoEscalaFisiatria>("EVA");
  const [eva, setEva] = useState<number | null>(null);
  const [caracter, setCaracter] = useState<string[]>([]);
  const [puntosDolor, setPuntosDolor] = useState<PuntoDolor[]>([]);
  const [barthel, setBarthel] = useState<Record<string, number>>({});
  const [oswestry, setOswestry] = useState<Record<string, number | null>>({});
  const [gonio, setGonio] = useState<MedicionGoniometrica[]>([]);
  const [fuerza, setFuerza] = useState<MedicionFuerza[]>([]);
  const [nombreEscala, setNombreEscala] = useState("");
  const [puntajeLibre, setPuntajeLibre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reiniciar() {
    setEva(null);
    setCaracter([]);
    setPuntosDolor([]);
    setBarthel({});
    setOswestry({});
    setGonio([]);
    setFuerza([]);
    setNombreEscala("");
    setPuntajeLibre("");
    setObservaciones("");
  }

  // Arma el payload de la escala elegida; devuelve un mensaje si falta algo.
  function construir():
    | { error: string }
    | { datos: Record<string, unknown>; puntajeTotal?: number; nombreEscala?: string } {
    switch (tipo) {
      case "EVA":
        if (eva === null) return { error: "Indica la intensidad del dolor (0 a 10)" };
        return {
          puntajeTotal: eva,
          datos: {
            interpretacion: interpretarEva(eva),
            ...(caracter.length ? { caracter } : {}),
            ...(puntosDolor.length ? { puntosDolor } : {}),
          },
        };
      case "BARTHEL": {
        const faltan = BARTHEL.filter((i) => barthel[i.clave] === undefined);
        if (faltan.length) return { error: `Faltan ítems del Barthel: ${faltan.map((i) => i.titulo).join(", ")}` };
        const total = puntajeBarthel(barthel);
        return { puntajeTotal: total, datos: { items: barthel, interpretacion: interpretarBarthel(total) } };
      }
      case "OSWESTRY": {
        const total = puntajeOswestry(oswestry);
        if (total === null) return { error: "Responde al menos una sección del Oswestry" };
        return { puntajeTotal: total, datos: { items: oswestry, interpretacion: interpretarOswestry(total) } };
      }
      case "GONIOMETRICA": {
        const mediciones = gonio.filter((m) => m.movimiento && m.grados !== null);
        if (!mediciones.length) return { error: "Agrega al menos una medición con sus grados" };
        return { datos: { mediciones } };
      }
      case "FUERZA_MUSCULAR": {
        const mediciones = fuerza.filter((m) => m.grupo && m.grado !== null);
        if (!mediciones.length) return { error: "Agrega al menos un grupo muscular con su grado" };
        return { datos: { mediciones } };
      }
      case "PERSONALIZADA":
        if (!nombreEscala.trim()) return { error: "Escribe el nombre de la escala" };
        return {
          nombreEscala: nombreEscala.trim(),
          puntajeTotal: puntajeLibre ? Number(puntajeLibre) : undefined,
          datos: {},
        };
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const r = construir();
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await agregarEvaluacion(pacienteId, {
        tipoEscala: tipo,
        ...r,
        observaciones: observaciones || undefined,
      });
      reiniciar();
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  const ayuda = ESCALAS.find((e) => e.value === tipo)?.ayuda;

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Select
        id="evaluacion-escala"
        label="Escala"
        value={tipo}
        hint={ayuda}
        onChange={(e) => {
          setTipo(e.target.value as TipoEscalaFisiatria);
          setError(null);
        }}
      >
        {ESCALAS.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </Select>

      {tipo === "EVA" && (
        <>
          <SelectorEva label="Intensidad del dolor" valor={eva} onChange={setEva} />
          <div>
            <span className="text-sm font-medium text-slate-700">Características del dolor</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {CARACTER_DOLOR.map((c) => (
                <Chip
                  key={c}
                  activo={caracter.includes(c)}
                  onClick={() => setCaracter((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <BodyDiagram puntos={puntosDolor} onChange={setPuntosDolor} />
        </>
      )}

      {tipo === "BARTHEL" && (
        <CuestionarioEscala
          items={BARTHEL}
          valores={barthel}
          onChange={(clave, v) => setBarthel((b) => ({ ...b, [clave]: v }))}
          resumen={(() => {
            const completos = BARTHEL.every((i) => barthel[i.clave] !== undefined);
            const total = puntajeBarthel(barthel);
            return completos ? `${total}/100 · ${interpretarBarthel(total)}` : `${total}/100 (incompleto)`;
          })()}
        />
      )}

      {tipo === "OSWESTRY" && (
        <CuestionarioEscala
          items={OSWESTRY}
          valores={oswestry}
          omitible
          onChange={(clave, v) => setOswestry((o) => ({ ...o, [clave]: v }))}
          resumen={(() => {
            const total = puntajeOswestry(oswestry);
            return total === null ? "Sin responder" : `${total}% · ${interpretarOswestry(total)}`;
          })()}
        />
      )}

      {tipo === "GONIOMETRICA" && <TablaGoniometria mediciones={gonio} onChange={setGonio} />}

      {tipo === "FUERZA_MUSCULAR" && <TablaFuerza mediciones={fuerza} onChange={setFuerza} />}

      {tipo === "PERSONALIZADA" && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre de la escala" value={nombreEscala} onChange={(e) => setNombreEscala(e.target.value)} />
          <Input
            label="Puntaje"
            type="number"
            step="0.1"
            value={puntajeLibre}
            onChange={(e) => setPuntajeLibre(e.target.value)}
          />
        </div>
      )}

      <Textarea label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={guardando} className="self-end">
        {guardando ? "Guardando..." : "Guardar evaluación"}
      </Button>
    </form>
  );
}

// ------------------------------------------------------------ piezas

export function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={clsx(
        "rounded-full border px-2.5 py-0.5 text-xs",
        activo ? "border-lily-blue-600 bg-lily-blue-600 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

const COLOR_EVA = (n: number) =>
  n === 0 ? "bg-lily-green-500" : n <= 3 ? "bg-lily-green-400" : n <= 6 ? "bg-amber-400" : "bg-red-500";

/** Botones 0-10 para la EVA; clic en el valor elegido lo borra. */
export function SelectorEva({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">{valor === null ? "Sin registrar" : `${valor}/10 · ${interpretarEva(valor)}`}</span>
      </div>
      <div className="mt-1 grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            type="button"
            key={n}
            onClick={() => onChange(valor === n ? null : n)}
            aria-pressed={valor === n}
            className={clsx(
              "rounded-md border py-1.5 text-xs font-medium transition",
              valor === n
                ? `${COLOR_EVA(n)} border-transparent text-white`
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function CuestionarioEscala({
  items,
  valores,
  onChange,
  resumen,
  omitible,
}: {
  items: ItemEscala[];
  valores: Record<string, number | null | undefined>;
  onChange: (clave: string, valor: number | null) => void;
  resumen: string;
  /** Permite dejar ítems sin responder (Oswestry). */
  omitible?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 rounded-lg bg-lily-blue-50 px-3 py-2 text-sm font-semibold text-lily-blue-800">
        Resultado: {resumen}
      </div>
      {items.map((item) => (
        <fieldset key={item.clave} className="rounded-lg border border-slate-200 p-2.5">
          <legend className="px-1 text-sm font-medium text-slate-700">{item.titulo}</legend>
          <div className="flex flex-col gap-1">
            {item.opciones.map((op) => (
              <label key={op.puntos} className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                <input
                  type="radio"
                  className="mt-0.5"
                  name={item.clave}
                  checked={valores[item.clave] === op.puntos}
                  onChange={() => onChange(item.clave, op.puntos)}
                />
                <span className="flex-1">{op.texto}</span>
                <span className="tabular-nums text-slate-400">{op.puntos}</span>
              </label>
            ))}
            {omitible && typeof valores[item.clave] === "number" && (
              <button
                type="button"
                onClick={() => onChange(item.clave, null)}
                className="self-start text-[11px] text-slate-400 hover:underline"
              >
                Dejar sin responder
              </button>
            )}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function TablaGoniometria({
  mediciones,
  onChange,
}: {
  mediciones: MedicionGoniometrica[];
  onChange: (m: MedicionGoniometrica[]) => void;
}) {
  const [articulacion, setArticulacion] = useState(GONIOMETRIA[0].articulacion);
  const [lado, setLado] = useState<Lado>("D");

  function agregarArticulacion() {
    const def = GONIOMETRIA.find((g) => g.articulacion === articulacion)!;
    // La columna no tiene lado; el resto se mide por lado.
    const ladoFinal = articulacion.startsWith("Columna") ? "" : lado;
    onChange([
      ...mediciones,
      ...def.movimientos.map((m) => ({
        articulacion,
        movimiento: m.nombre,
        lado: ladoFinal as Lado,
        grados: null,
        normal: m.normal,
      })),
    ]);
  }

  function actualizar(i: number, grados: number | null) {
    onChange(mediciones.map((m, j) => (j === i ? { ...m, grados } : m)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Select label="Articulación" value={articulacion} onChange={(e) => setArticulacion(e.target.value)}>
          {GONIOMETRIA.map((g) => (
            <option key={g.articulacion}>{g.articulacion}</option>
          ))}
        </Select>
        {!articulacion.startsWith("Columna") && (
          <Select label="Lado" value={lado} onChange={(e) => setLado(e.target.value as Lado)}>
            {LADOS.filter((l) => l.value).map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        )}
        <Button type="button" variant="secondary" onClick={agregarArticulacion}>
          + Agregar movimientos
        </Button>
      </div>

      {mediciones.length > 0 && (
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 font-medium">Movimiento</th>
              <th className="py-1 font-medium">Grados</th>
              <th className="py-1 text-right font-medium">Normal</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mediciones.map((m, i) => {
              const pct = porcentajeDelNormal(m);
              return (
                <tr key={i}>
                  <td className="py-1 pr-2 text-slate-700">
                    {m.articulacion} · {m.movimiento}
                    {m.lado && <span className="text-slate-400"> ({m.lado === "D" ? "der." : "izq."})</span>}
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      min={-30}
                      max={200}
                      value={m.grados ?? ""}
                      onChange={(e) => actualizar(i, e.target.value === "" ? null : Number(e.target.value))}
                      className="w-16 rounded border border-slate-300 px-1.5 py-0.5"
                      aria-label={`Grados de ${m.articulacion} ${m.movimiento}`}
                    />
                    {pct !== null && (
                      <span className={clsx("ml-1.5", pct < 75 ? "text-amber-700" : "text-slate-400")}>{pct}%</span>
                    )}
                  </td>
                  <td className="py-1 text-right text-slate-400">{m.normal ?? "—"}°</td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      onClick={() => onChange(mediciones.filter((_, j) => j !== i))}
                      className="px-1 text-slate-400 hover:text-red-600"
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-[11px] text-slate-400">
        Deja en blanco los movimientos que no midas; no se guardan. En ámbar: menos del 75% del rango normal.
      </p>
    </div>
  );
}

function TablaFuerza({
  mediciones,
  onChange,
}: {
  mediciones: MedicionFuerza[];
  onChange: (m: MedicionFuerza[]) => void;
}) {
  function actualizar(i: number, cambios: Partial<MedicionFuerza>) {
    onChange(mediciones.map((m, j) => (j === i ? { ...m, ...cambios } : m)));
  }

  return (
    <div className="flex flex-col gap-2">
      <datalist id="grupos-musculares">
        {GRUPOS_MUSCULARES.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      {mediciones.map((m, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            list="grupos-musculares"
            placeholder="Grupo muscular"
            value={m.grupo}
            onChange={(e) => actualizar(i, { grupo: e.target.value })}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select
            value={m.lado}
            onChange={(e) => actualizar(i, { lado: e.target.value as Lado })}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            aria-label="Lado"
          >
            {LADOS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <select
            value={m.grado ?? ""}
            onChange={(e) => actualizar(i, { grado: e.target.value === "" ? null : Number(e.target.value) })}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            aria-label="Grado"
          >
            <option value="">Grado...</option>
            {GRADOS_DANIELS.map((g) => (
              <option key={g.grado} value={g.grado}>
                {g.texto}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(mediciones.filter((_, j) => j !== i))}
            className="px-1 text-slate-400 hover:text-red-600"
            aria-label="Quitar"
          >
            ✕
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        onClick={() => onChange([...mediciones, { grupo: "", lado: "D", grado: null }])}
      >
        + Agregar grupo muscular
      </Button>
    </div>
  );
}
