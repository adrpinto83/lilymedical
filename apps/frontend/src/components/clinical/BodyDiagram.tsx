import { MouseEvent, useState } from "react";
import clsx from "clsx";

export interface PuntoDolor {
  x: number; // porcentaje 0-100 relativo al ancho del diagrama
  y: number; // porcentaje 0-100 relativo al alto del diagrama
  vista: "frontal" | "dorsal";
}

interface BodyDiagramProps {
  puntos: PuntoDolor[];
  onChange?: (puntos: PuntoDolor[]) => void;
  className?: string;
}

const RADIO_ELIMINAR = 3.5; // % de distancia para considerar "click sobre un punto existente"

function Silueta() {
  return (
    <g fill="#dbe7ee" stroke="#7c8c81" strokeWidth={2}>
      <circle cx={100} cy={40} r={28} />
      <rect x={90} y={64} width={20} height={16} />
      <rect x={60} y={78} width={80} height={130} rx={22} />
      <rect x={28} y={88} width={24} height={112} rx={11} />
      <rect x={148} y={88} width={24} height={112} rx={11} />
      <circle cx={40} cy={205} r={9} />
      <circle cx={160} cy={205} r={9} />
      <rect x={68} y={202} width={30} height={140} rx={13} />
      <rect x={102} y={202} width={30} height={140} rx={13} />
      <ellipse cx={83} cy={348} rx={15} ry={8} />
      <ellipse cx={117} cy={348} rx={15} ry={8} />
    </g>
  );
}

export function BodyDiagram({ puntos, onChange, className }: BodyDiagramProps) {
  const [vista, setVista] = useState<"frontal" | "dorsal">("frontal");
  const editable = !!onChange;
  const puntosVista = puntos.filter((p) => p.vista === vista);

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    if (!onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const cercano = puntosVista.find(
      (p) => Math.hypot(p.x - x, p.y - y) < RADIO_ELIMINAR
    );

    if (cercano) {
      onChange(puntos.filter((p) => p !== cercano));
    } else {
      onChange([...puntos, { x, y, vista }]);
    }
  }

  return (
    <div className={clsx("flex flex-col items-center gap-2", className)}>
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
        {(["frontal", "dorsal"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={clsx(
              "rounded px-3 py-1 font-medium",
              vista === v ? "bg-white text-lily-blue-700 shadow-sm" : "text-slate-500"
            )}
          >
            {v === "frontal" ? "Vista frontal" : "Vista dorsal"}
          </button>
        ))}
      </div>
      <svg
        viewBox="0 0 200 380"
        style={{ aspectRatio: "200 / 380" }}
        className={clsx("w-40 max-w-full", editable && "cursor-crosshair")}
        onClick={handleClick}
      >
        <Silueta />
        {puntosVista.map((p, i) => (
          <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={4} fill="#dc2626" stroke="white" strokeWidth={1} />
        ))}
      </svg>
      {editable && (
        <p className="text-center text-xs text-slate-500">
          Click para marcar dolor · click sobre un punto para quitarlo
        </p>
      )}
    </div>
  );
}
