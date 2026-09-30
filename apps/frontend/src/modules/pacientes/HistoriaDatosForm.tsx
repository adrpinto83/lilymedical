import { FormEvent, ReactNode, TextareaHTMLAttributes, useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/Input";
import { HistoriaClinica } from "../../types";
import { actualizarHistoria } from "../../services/historiasClinicas";
import { getErrorMessage } from "../../services/api";
import { DOMINANCIAS } from "./fisiatria/escalas";

// En el orden de la hoja de "Historia fisiátrica" en papel de la consulta.
const CAMPOS_VACIOS = {
  fechaConsulta: "",
  ocupacion: "",
  dominancia: "",
  actividadFisica: "",
  antecedentesFamiliares: "",
  antecedentesMedicos: "",
  antecedentesQuirurgicos: "",
  alergias: "",
  contraindicaciones: "",
  motivoConsulta: "",
  enfermedadActual: "",
  examenFisico: "",
  estudiosComplementarios: "",
  diagnosticoPrincipal: "",
  codigoCIE10: "",
  planTerapeutico: "",
  objetivosRehabilitacion: "",
};
type CamposHistoria = typeof CAMPOS_VACIOS;

function valoresIniciales(historia: HistoriaClinica): CamposHistoria {
  return Object.fromEntries(
    Object.keys(CAMPOS_VACIOS).map((k) => {
      const valor = (historia[k as keyof HistoriaClinica] as string | null) ?? "";
      // La fecha llega como ISO; el input de tipo fecha espera AAAA-MM-DD.
      return [k, k === "fechaConsulta" ? valor.slice(0, 10) : valor];
    })
  ) as CamposHistoria;
}

export function HistoriaDatosForm({
  historia,
  onGuardado,
  onCancelar,
}: {
  historia: HistoriaClinica;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [original] = useState(() => valoresIniciales(historia));
  const [datos, setDatos] = useState(original);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const cambiados = (Object.keys(datos) as (keyof CamposHistoria)[]).filter((k) => datos[k] !== original[k]);

  // Ctrl/Cmd + S guarda sin tener que bajar hasta el botón.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (cambiados.length === 0) {
      onCancelar();
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      // Solo lo que cambió: no reescribe (ni re-cifra) campos intactos.
      const cambios = Object.fromEntries(cambiados.map((k) => [k, datos[k]]));
      await actualizarHistoria(historia.pacienteId, cambios as Partial<HistoriaClinica>);
      onGuardado();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    if (cambiados.length > 0 && !confirm("Tienes cambios sin guardar en la historia. ¿Descartarlos?")) return;
    onCancelar();
  }

  const campo = (k: keyof CamposHistoria) => ({
    id: `historia-${k}`,
    value: datos[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setDatos((d) => ({ ...d, [k]: e.target.value })),
  });

  return (
    <form ref={formRef} onSubmit={guardar} className="flex flex-col">
      <Seccion titulo="Datos de la historia">
        <Celda ancho={1}>
          <Input label="Fecha" type="date" {...campo("fechaConsulta")} />
        </Celda>
        <Celda ancho={1}>
          <Input label="Ocupación" placeholder="ej. Enfermera" {...campo("ocupacion")} />
        </Celda>
        <Celda ancho={1}>
          <Select label="Dominancia" {...campo("dominancia")}>
            <option value="">Sin registrar</option>
            {DOMINANCIAS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Celda>
        <Celda ancho={1}>
          <Input label="Actividad física" placeholder="ej. Sedentaria, camina 3×/sem" {...campo("actividadFisica")} />
        </Celda>
      </Seccion>

      <Seccion titulo="Antecedentes">
        <Celda ancho={4}>
          <TextoLargo
            label="Antecedentes familiares"
            filas={2}
            placeholder="ej. Padre fallecido por CA gástrico, madre HTA y diabetes"
            {...campo("antecedentesFamiliares")}
          />
        </Celda>
        <Celda ancho={2}>
          <TextoLargo
            label="Antecedentes personales (médicos)"
            filas={2}
            placeholder="ej. HTA, diabetes, asma"
            {...campo("antecedentesMedicos")}
          />
        </Celda>
        <Celda ancho={2}>
          <TextoLargo
            label="Antecedentes personales (quirúrgicos)"
            filas={2}
            placeholder="ej. Apendicectomía, 2 cesáreas, histerectomía"
            {...campo("antecedentesQuirurgicos")}
          />
        </Celda>
        <Celda ancho={2}>
          <TextoLargo
            label="Alergias"
            filas={1}
            placeholder="ej. Penicilina, AINES, látex"
            hint="Aparece como alerta en los récipes"
            {...campo("alergias")}
          />
        </Celda>
        <Celda ancho={2}>
          <TextoLargo
            label="Contraindicaciones para agentes físicos"
            filas={1}
            placeholder="ej. Marcapasos, prótesis metálica, embarazo"
            hint="Aparece como alerta al registrar sesiones"
            {...campo("contraindicaciones")}
          />
        </Celda>
      </Seccion>

      <Seccion titulo="Consulta">
        <Celda ancho={4}>
          <Input label="Motivo de consulta" placeholder="ej. Lesión de N. cubital (I)" {...campo("motivoConsulta")} />
        </Celda>
        <Celda ancho={4}>
          <TextoLargo
            label="Enfermedad actual"
            filas={4}
            placeholder="Se trata de paciente… Inicio, evolución y características del cuadro"
            {...campo("enfermedadActual")}
          />
        </Celda>
        <Celda ancho={4}>
          <TextoLargo
            label="Examen físico"
            filas={4}
            placeholder="Inspección, postura, marcha, palpación, fuerza, sensibilidad, pruebas especiales"
            {...campo("examenFisico")}
          />
        </Celda>
        <Celda ancho={4}>
          <TextoLargo
            label="Estudios complementarios"
            filas={2}
            placeholder="ej. Rx de columna lumbar, RM, EMG / estudio de conducción nerviosa"
            {...campo("estudiosComplementarios")}
          />
        </Celda>
      </Seccion>

      <Seccion titulo="Diagnóstico y plan">
        <Celda ancho={3}>
          <Input label="IDX (diagnóstico)" placeholder="ej. Lesión de N. cubital (I)" {...campo("diagnosticoPrincipal")} />
        </Celda>
        <Celda ancho={1}>
          <Input label="CIE-10" placeholder="ej. G56.2" {...campo("codigoCIE10")} />
        </Celda>
        <Celda ancho={4}>
          <TextoLargo
            label="Plan de tratamiento"
            filas={4}
            placeholder={"1) Estudio de conducción nerviosa y EMG\n2) Medicación\n3) FT: 15 sesiones"}
            {...campo("planTerapeutico")}
          />
        </Celda>
        <Celda ancho={4}>
          <TextoLargo
            label="Objetivos de rehabilitación"
            filas={2}
            placeholder="ej. Disminuir dolor a EVA ≤ 3, recuperar flexión de dedos, reintegro laboral"
            {...campo("objetivosRehabilitacion")}
          />
        </Celda>
      </Seccion>

      {/* Siempre a la vista mientras se llena la historia, aunque sea larga. */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <p className="text-xs text-slate-500">
          {error ? (
            <span className="text-sm text-red-600">{error}</span>
          ) : cambiados.length > 0 ? (
            `${cambiados.length} campo(s) modificado(s) · Ctrl + S para guardar`
          ) : (
            "Sin cambios"
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={cancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar historia"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-3 w-full text-xs font-semibold uppercase tracking-wide text-lily-blue-700">
        {titulo}
      </legend>
      <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </fieldset>
  );
}

// Clases completas (no interpoladas) para que Tailwind las genere.
const ANCHO = {
  1: "lg:col-span-1",
  2: "sm:col-span-2 lg:col-span-2",
  3: "sm:col-span-2 lg:col-span-3",
  4: "sm:col-span-2 lg:col-span-4",
} as const;

function Celda({ ancho, children }: { ancho: keyof typeof ANCHO; children: ReactNode }) {
  return <div className={ANCHO[ancho]}>{children}</div>;
}

/** Cuadro de texto que crece con lo que se escribe, sin barra de desplazamiento. */
function TextoLargo({
  filas,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; filas: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return <Textarea ref={ref} rows={filas} className={clsx("resize-none overflow-hidden leading-relaxed")} {...props} />;
}
