import { useState } from "react";
import clsx from "clsx";
import { EquiposPanel } from "./EquiposPanel";
import { InsumosPanel } from "./InsumosPanel";

type Tab = "equipos" | "insumos";

const tabs: { key: Tab; label: string }[] = [
  { key: "equipos", label: "Equipos y mantenimiento" },
  { key: "insumos", label: "Insumos" },
];

export function InventarioPage() {
  const [tab, setTab] = useState<Tab>("equipos");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Inventario</h1>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-lily-blue-600 text-lily-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "equipos" ? <EquiposPanel /> : <InsumosPanel />}
    </div>
  );
}
