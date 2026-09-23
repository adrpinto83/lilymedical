import { useCallback, useEffect, useRef, useState } from "react";

export interface FotoCarrusel {
  url: string;
  alt: string;
}

const INTERVALO_MS = 5000;

/** `matchMedia` no existe en jsdom, así que se consulta con guarda. */
function prefiereMenosMovimiento(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Carrusel({ fotos, etiqueta }: { fotos: FotoCarrusel[]; etiqueta: string }) {
  const total = fotos.length;
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(() => prefiereMenosMovimiento());
  const [interactuando, setInteractuando] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const inicioX = useRef<number | null>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);

  const ir = useCallback(
    (destino: number) => setIndice(((destino % total) + total) % total),
    [total]
  );

  // Avance automático: se detiene con el botón de pausa, al pasar el ratón, al
  // enfocar con el teclado y mientras una foto está ampliada (WCAG 2.2.2).
  useEffect(() => {
    if (pausado || interactuando || ampliada || total < 2) return;
    const id = window.setInterval(() => setIndice((i) => (i + 1) % total), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [pausado, interactuando, ampliada, total]);

  // Con la foto ampliada, el teclado gobierna el diálogo y la página no rueda.
  useEffect(() => {
    if (!ampliada) return;
    cerrar.current?.focus();
    // Se guarda el nodo ahora: al limpiar, el ref ya podría apuntar a otro.
    const volverA = disparador.current;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmpliada(false);
      if (e.key === "ArrowRight") setIndice((i) => (i + 1) % total);
      if (e.key === "ArrowLeft") setIndice((i) => (i - 1 + total) % total);
    };
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = previo;
      volverA?.focus();
    };
  }, [ampliada, total]);

  if (total === 0) return null;

  const actual = fotos[indice];

  function alSoltar(clientX: number) {
    if (inicioX.current === null) return;
    const recorrido = clientX - inicioX.current;
    inicioX.current = null;
    if (Math.abs(recorrido) > 40) ir(indice + (recorrido < 0 ? 1 : -1));
  }

  const flecha =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-lily-blue-800 shadow-md transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600";

  return (
    <>
      <div
        role="group"
        aria-roledescription="carrusel"
        aria-label={etiqueta}
        onMouseEnter={() => setInteractuando(true)}
        onMouseLeave={() => setInteractuando(false)}
        onFocus={() => setInteractuando(true)}
        onBlur={() => setInteractuando(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") ir(indice + 1);
          if (e.key === "ArrowLeft") ir(indice - 1);
        }}
        onPointerDown={(e) => (inicioX.current = e.clientX)}
        onPointerUp={(e) => alSoltar(e.clientX)}
        onPointerCancel={() => (inicioX.current = null)}
        className="relative"
      >
        <div className="relative overflow-hidden rounded-3xl bg-lily-blue-100">
          <div
            className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${indice * 100}%)` }}
          >
            {fotos.map((foto, i) => (
              <figure key={foto.url} className="relative w-full shrink-0" aria-hidden={i !== indice}>
                <img
                  src={foto.url}
                  alt={foto.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  className="aspect-4/3 w-full object-cover sm:aspect-16/9"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-lily-blue-900/80 to-transparent px-5 pb-4 pt-12 text-left text-sm font-medium text-white">
                  {foto.alt}
                </figcaption>
              </figure>
            ))}
          </div>

          <button
            ref={disparador}
            type="button"
            onClick={() => setAmpliada(true)}
            aria-label={`Ampliar la foto: ${actual.alt}`}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lily-blue-800 shadow-md transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600"
          >
            <span aria-hidden="true">⤢</span>
          </button>

          {total > 1 && (
            <p className="absolute left-3 top-3 rounded-full bg-lily-blue-900/70 px-3 py-1 text-xs font-semibold text-white">
              <span className="sr-only">Foto </span>
              {indice + 1} / {total}
            </p>
          )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(indice - 1)}
              aria-label="Foto anterior"
              className={`${flecha} left-3`}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => ir(indice + 1)}
              aria-label="Foto siguiente"
              className={`${flecha} right-3`}
            >
              <span aria-hidden="true">›</span>
            </button>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPausado((v) => !v)}
                aria-label={pausado ? "Reanudar el paso automático" : "Pausar el paso automático"}
                className="shrink-0 rounded-full px-2 py-1 text-sm text-lily-blue-600 transition-colors hover:bg-lily-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600"
              >
                <span aria-hidden="true">{pausado ? "▶" : "❚❚"}</span>
              </button>
              <ul className="flex gap-2 overflow-x-auto py-1">
                {fotos.map((foto, i) => (
                  <li key={foto.url}>
                    <button
                      type="button"
                      onClick={() => ir(i)}
                      aria-label={`Ir a la foto ${i + 1} de ${total}: ${foto.alt}`}
                      aria-current={i === indice}
                      className={`block overflow-hidden rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600 ${
                        i === indice
                          ? "ring-2 ring-lily-pink-600 ring-offset-2"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={foto.url}
                        alt=""
                        loading="lazy"
                        className="h-14 w-20 object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {ampliada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada: ${actual.alt}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAmpliada(false);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-lily-blue-900/95 p-4"
        >
          <img
            src={actual.url}
            alt={actual.alt}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
          />
          <p className="max-w-2xl text-center text-sm text-white">{actual.alt}</p>

          {total > 1 && (
            <div className="flex items-center gap-4 text-white">
              <button
                type="button"
                onClick={() => ir(indice - 1)}
                aria-label="Foto anterior"
                className="rounded-full px-3 py-1 text-2xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <span className="text-sm font-semibold">
                {indice + 1} / {total}
              </span>
              <button
                type="button"
                onClick={() => ir(indice + 1)}
                aria-label="Foto siguiente"
                className="rounded-full px-3 py-1 text-2xl hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )}

          <button
            ref={cerrar}
            type="button"
            onClick={() => setAmpliada(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}
