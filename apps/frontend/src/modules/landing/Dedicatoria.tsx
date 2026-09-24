import { useEffect, useRef, useState } from "react";

// Aviso de bienvenida de la portada: la página es un regalo de cumpleaños
// para la Dra. Lilia. Se muestra una vez por sesión del navegador para no
// repetirse cada vez que alguien vuelve a la portada.
const CLAVE_VISTA = "lilymedical:dedicatoria-vista";

function yaSeMostro(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_VISTA) === "1";
  } catch {
    return false;
  }
}

function marcarVista() {
  try {
    sessionStorage.setItem(CLAVE_VISTA, "1");
  } catch {
    // sin almacenamiento (modo privado estricto): simplemente se volverá a mostrar
  }
}

// Flor de seis pétalos centrada en (cx, cy).
function Flor({ cx, cy, r, petalo, centro }: { cx: number; cy: number; r: number; petalo: string; centro: string }) {
  return (
    <g>
      {[0, 60, 120, 180, 240, 300].map((angulo) => (
        <ellipse
          key={angulo}
          cx={cx}
          cy={cy - r * 0.6}
          rx={r * 0.42}
          ry={r * 0.62}
          fill={petalo}
          transform={`rotate(${angulo} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.32} fill={centro} />
    </g>
  );
}

const flores = [
  { cx: 80, cy: 46, r: 17, petalo: "#d96f80", centro: "#f6cad0" },
  { cx: 52, cy: 62, r: 15, petalo: "#eea6b0", centro: "#c05468" },
  { cx: 108, cy: 62, r: 15, petalo: "#e58a97", centro: "#fbe4e7" },
  { cx: 64, cy: 88, r: 13, petalo: "#f6cad0", centro: "#d96f80" },
  { cx: 97, cy: 88, r: 13, petalo: "#c05468", centro: "#fbe4e7" },
  { cx: 34, cy: 86, r: 11, petalo: "#fbe4e7", centro: "#e58a97" },
  { cx: 126, cy: 86, r: 11, petalo: "#eea6b0", centro: "#9c4254" },
];

function RamoDeFlores() {
  return (
    <svg viewBox="0 0 160 190" className="h-40 w-auto" aria-hidden="true">
      {/* tallos */}
      <g stroke="#75907a" strokeWidth="2.5" strokeLinecap="round">
        {flores.map((f) => (
          <line key={`${f.cx}-${f.cy}`} x1={f.cx} y1={f.cy} x2="80" y2="150" />
        ))}
      </g>
      {/* hojas */}
      <g fill="#93a897">
        <ellipse cx="44" cy="104" rx="14" ry="6" transform="rotate(-35 44 104)" />
        <ellipse cx="116" cy="104" rx="14" ry="6" transform="rotate(35 116 104)" />
        <ellipse cx="68" cy="106" rx="10" ry="4.5" transform="rotate(-60 68 106)" />
        <ellipse cx="92" cy="106" rx="10" ry="4.5" transform="rotate(60 92 106)" />
      </g>
      {flores.map((f) => (
        <Flor key={`${f.cx}-${f.cy}`} {...f} />
      ))}
      {/* envoltorio */}
      <path d="M36 112 L124 112 L92 178 L68 178 Z" fill="#cfdad1" />
      <path d="M36 112 L80 124 L124 112 L92 178 L68 178 Z" fill="#b1c2b4" opacity="0.6" />
      {/* lazo */}
      <g fill="#c05468">
        <path d="M80 140 C66 128 58 138 64 146 C68 151 76 146 80 140 Z" />
        <path d="M80 140 C94 128 102 138 96 146 C92 151 84 146 80 140 Z" />
        <path d="M78 141 L70 162 L76 160 L80 146 Z" />
        <path d="M82 141 L90 162 L84 160 L80 146 Z" />
      </g>
      <circle cx="80" cy="141" r="4" fill="#9c4254" />
    </svg>
  );
}

export function Dedicatoria() {
  const [abierta, setAbierta] = useState(() => !yaSeMostro());
  const botonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierta) return;
    marcarVista();
    botonRef.current?.focus();
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(false);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierta]);

  if (!abierta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-lily-blue-900/50 p-4 backdrop-blur-sm"
      onClick={() => setAbierta(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dedicatoria-titulo"
        className="dedicatoria-entrada relative w-full max-w-md rounded-3xl bg-gradient-to-b from-lily-pink-50 to-white px-6 pb-7 pt-6 text-center shadow-2xl ring-1 ring-lily-pink-100 sm:px-9"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setAbierta(false)}
          className="absolute right-4 top-4 rounded-full p-1.5 text-lily-blue-400 hover:bg-lily-pink-100 hover:text-lily-blue-700"
          aria-label="Cerrar dedicatoria"
        >
          ✕
        </button>

        <div className="dedicatoria-ramo mx-auto flex justify-center">
          <RamoDeFlores />
        </div>

        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-lily-pink-600">Dedicatoria</p>
        <h2 id="dedicatoria-titulo" className="font-display mt-1 text-2xl font-bold text-lily-blue-800">
          ¡Feliz cumpleaños, Dra. Lilia!
        </h2>

        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-lily-blue-700">
          <p>
            Esta página está dedicada a la doctora más especial de mi vida.
          </p>
          <p>
            Es el regalo que te debía de tus dos últimos cumpleaños. Llega tarde, pero está hecho con todo el
            cariño del mundo.
          </p>
          <p>
            Aunque la vida no nos tenga uno al lado del otro, como a mí me gustaría, quiero que sepas que
            siempre tendrás en mí a un eterno amigo que te quiere incondicionalmente y te querrá el resto de
            la vida.
          </p>
        </div>

        <p className="font-display mt-5 text-xl font-bold text-lily-pink-600">— AP ♡</p>

        <button
          ref={botonRef}
          type="button"
          onClick={() => setAbierta(false)}
          className="mt-6 rounded-full bg-lily-pink-600 px-7 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-lily-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600"
        >
          Entrar al sitio
        </button>
      </div>
    </div>
  );
}
