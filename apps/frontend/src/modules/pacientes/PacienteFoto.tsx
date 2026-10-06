import { ChangeEvent, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Paciente } from "../../types";
import { obtenerFotoPaciente, quitarFotoPaciente, subirFotoPaciente } from "../../services/pacientes";
import { getErrorMessage } from "../../services/api";
import { recortarFoto } from "./recortarFoto";

function iniciales(p: Pick<Paciente, "nombres" | "apellidos">) {
  return `${p.nombres.trim()[0] ?? ""}${p.apellidos.trim()[0] ?? ""}`.toUpperCase();
}

export function PacienteFoto({
  paciente,
  editable,
  onCambio,
  className,
}: {
  paciente: Paciente;
  /** Personal que gestiona pacientes: puede subir, cambiar o quitar la foto. */
  editable?: boolean;
  onCambio?: (paciente: Paciente) => void;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState(false);
  const [menu, setMenu] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(null);
    if (!paciente.fotoUrl) return;
    let actual: string | null = null;
    let vigente = true;
    obtenerFotoPaciente(paciente.id)
      .then((blob) => {
        if (!vigente) return;
        actual = URL.createObjectURL(blob);
        setUrl(actual);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
      if (actual) URL.revokeObjectURL(actual);
    };
  }, [paciente.id, paciente.fotoUrl]);

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setTrabajando(true);
    setError(null);
    try {
      const actualizado = await subirFotoPaciente(paciente.id, await recortarFoto(archivo));
      onCambio?.(actualizado);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTrabajando(false);
    }
  }

  async function quitar() {
    setMenu(false);
    if (!confirm("¿Quitar la foto del paciente?")) return;
    setTrabajando(true);
    setError(null);
    try {
      onCambio?.(await quitarFotoPaciente(paciente.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTrabajando(false);
    }
  }

  function alPulsar() {
    if (editable) setMenu((m) => !m);
    else if (url) setAmpliada(true);
  }

  return (
    <div className={clsx("relative shrink-0", className)}>
      <button
        type="button"
        onClick={alPulsar}
        disabled={trabajando || (!editable && !url)}
        aria-label={editable ? "Foto del paciente: cambiar o quitar" : "Ver foto del paciente"}
        className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-lily-blue-100 text-lg font-semibold text-lily-blue-700 ring-2 ring-white shadow disabled:cursor-default"
      >
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : iniciales(paciente)}
        {editable && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/50 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {trabajando ? "..." : paciente.fotoUrl ? "Cambiar" : "Agregar"}
          </span>
        )}
      </button>

      {menu && (
        <div className="absolute left-0 top-full z-20 mt-1 flex w-40 flex-col rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {url && (
            <button
              type="button"
              className="px-3 py-1.5 text-left hover:bg-slate-50"
              onClick={() => {
                setMenu(false);
                setAmpliada(true);
              }}
            >
              Ver foto
            </button>
          )}
          <button
            type="button"
            className="px-3 py-1.5 text-left hover:bg-slate-50"
            onClick={() => {
              setMenu(false);
              inputRef.current?.click();
            }}
          >
            {paciente.fotoUrl ? "Cambiar foto" : "Agregar foto"}
          </button>
          {paciente.fotoUrl && (
            <button type="button" className="px-3 py-1.5 text-left text-red-600 hover:bg-red-50" onClick={quitar}>
              Quitar foto
            </button>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={alElegir} className="hidden" aria-label="Elegir foto" />
      {error && <p className="absolute left-0 top-full mt-1 w-56 text-xs text-red-600">{error}</p>}

      {ampliada && url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4" onClick={() => setAmpliada(false)}>
          <img src={url} alt="Foto del paciente" className="max-h-full max-w-full rounded-lg shadow-xl" />
        </div>
      )}
    </div>
  );
}
