import { useEffect, useRef, useState } from "react";
import { LogoMark } from "../../components/layout/Logo";
import { AvisoPortada as Aviso, obtenerAvisoActivo } from "../../services/avisosPortada";

// Ventana de bienvenida de la portada. Qué se muestra (la dedicatoria de
// cumpleaños, un aviso comercial o nada) se decide desde la app, en
// "Aviso de portada". Se muestra una vez por sesión del navegador; si el aviso
// cambia, la huella cambia y vuelve a mostrarse.
const CLAVE_VISTA = "lilymedical:aviso-portada-visto";

function huella(aviso: Aviso) {
  return `${aviso.id}:${aviso.updatedAt}`;
}

function yaSeMostro(aviso: Aviso): boolean {
  try {
    return sessionStorage.getItem(CLAVE_VISTA) === huella(aviso);
  } catch {
    return false;
  }
}

function marcarVisto(aviso: Aviso) {
  try {
    sessionStorage.setItem(CLAVE_VISTA, huella(aviso));
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

/** Carga el aviso activo y lo muestra si aún no se vio en esta sesión. */
export function AvisoPortada() {
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerAvisoActivo()
      .then((activo) => {
        if (vigente && activo && !yaSeMostro(activo)) setAviso(activo);
      })
      // Sin API no hay aviso: mejor nada que mostrar uno que se desactivó.
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  if (!aviso) return null;
  return <VentanaAviso aviso={aviso} onCerrar={() => setAviso(null)} />;
}

export function VentanaAviso({
  aviso,
  onCerrar,
  vistaPrevia = false,
}: {
  aviso: Aviso;
  onCerrar: () => void;
  /** Desde la gestión: no cuenta como visto en la portada. */
  vistaPrevia?: boolean;
}) {
  const botonRef = useRef<HTMLButtonElement>(null);
  const esDedicatoria = aviso.tipo === "DEDICATORIA";
  const externo = aviso.enlaceUrl ? /^https?:\/\//i.test(aviso.enlaceUrl) : false;

  useEffect(() => {
    if (!vistaPrevia) marcarVisto(aviso);
    botonRef.current?.focus();
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [aviso, onCerrar, vistaPrevia]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-lily-blue-900/50 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-portada-titulo"
        className="dedicatoria-entrada relative w-full max-w-md rounded-3xl bg-gradient-to-b from-lily-pink-50 to-white px-6 pb-7 pt-6 text-center shadow-2xl ring-1 ring-lily-pink-100 sm:px-9"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCerrar}
          className="absolute right-4 top-4 rounded-full p-1.5 text-lily-blue-400 hover:bg-lily-pink-100 hover:text-lily-blue-700"
          aria-label="Cerrar aviso"
        >
          ✕
        </button>

        {esDedicatoria ? (
          <div className="dedicatoria-ramo mx-auto flex justify-center">
            <RamoDeFlores />
          </div>
        ) : (
          <div className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-lily-pink-100">
            <LogoMark className="h-12 w-12" />
          </div>
        )}

        {aviso.etiqueta && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-lily-pink-600">
            {aviso.etiqueta}
          </p>
        )}
        <h2 id="aviso-portada-titulo" className="font-display mt-1 text-2xl font-bold text-lily-blue-800">
          {aviso.titulo}
        </h2>

        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-lily-blue-700">
          {aviso.mensaje
            .split(/\n\s*\n/)
            .map((parrafo) => parrafo.trim())
            .filter(Boolean)
            .map((parrafo, i) => (
              <p key={i} className="whitespace-pre-line">
                {parrafo}
              </p>
            ))}
        </div>

        {aviso.firma && (
          <p className="font-display mt-5 text-xl font-bold text-lily-pink-600">{aviso.firma}</p>
        )}

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {aviso.enlaceUrl && (
            <a
              href={aviso.enlaceUrl}
              onClick={onCerrar}
              {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="rounded-full bg-lily-blue-700 px-7 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-lily-blue-800"
            >
              {aviso.enlaceTexto || "Más información"}
            </a>
          )}
          <button
            ref={botonRef}
            type="button"
            onClick={onCerrar}
            className="rounded-full bg-lily-pink-600 px-7 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-lily-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lily-pink-600"
          >
            {aviso.textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
