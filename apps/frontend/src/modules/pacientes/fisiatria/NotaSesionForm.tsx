import { FormEvent, useEffect, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "../../../components/ui/Button";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { Cita } from "../../../types";
import { crearSesion } from "../../../services/sesiones";
import { listarCitas } from "../../../services/citas";
import { getErrorMessage } from "../../../services/api";
import { MODALIDADES } from "./escalas";
import { Chip, SelectorEva } from "./EvaluacionForm";

type Asistencia = "ASISTIO" | "INASISTIO" | "CANCELO";

const PLANTILLA_SOAP =
  "S: (lo que refiere el paciente)\nO: (hallazgos al examen)\nA: (valoración de la evolución)\nP: (plan para la próxima sesión)";

export function NotaSesionForm({
  pacienteId,
  contraindicaciones,
  onSaved,
}: {
  pacienteId: string;
  contraindicaciones?: string | null;
  onSaved: () => void;
}) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [citaId, setCitaId] = useState("");
  const [asistencia, setAsistencia] = useState<Asistencia>("ASISTIO");
  const [evaPre, setEvaPre] = useState<number | null>(null);
  const [evaPost, setEvaPost] = useState<number | null>(null);
  const [modalidades, setModalidades] = useState<string[]>([]);
  const [otraModalidad, setOtraModalidad] = useState("");
  const [nota, setNota] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Citas pendientes recientes del paciente: al vincular la sesión, la cita
  // queda como atendida (o no asistió / cancelada) sin pasar por la agenda.
  async function cargarCitas() {
    const hoy = startOfDay(new Date());
    try {
      const lista = await listarCitas(addDays(hoy, -7), addDays(hoy, 2), undefined, pacienteId);
      const pendientes = lista.filter((c) => c.estado === "PROGRAMADA" || c.estado === "CONFIRMADA");
      setCitas(pendientes);
      const deHoy = pendientes.find((c) => startOfDay(new Date(c.fechaHoraInicio)).getTime() === hoy.getTime());
      setCitaId(deHoy?.id ?? "");
    } catch {
      setCitas([]);
    }
  }

  useEffect(() => {
    cargarCitas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  function toggleModalidad(m: string) {
    setModalidades((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  }

  function agregarOtra() {
    const m = otraModalidad.trim();
    if (m && !modalidades.includes(m)) setModalidades((l) => [...l, m]);
    setOtraModalidad("");
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nota.trim()) {
      setError("Escribe la nota de evolución");
      return;
    }
    setGuardando(true);
    setError(null);
    const asistio = asistencia === "ASISTIO";
    try {
      await crearSesion({
        pacienteId,
        citaId: citaId || undefined,
        asistencia,
        notaEvolucion: nota.trim(),
        tratamientoAplicado: tratamiento.trim() || undefined,
        evaPre: asistio ? evaPre : null,
        evaPost: asistio ? evaPost : null,
        modalidades: asistio ? modalidades : [],
      });
      setNota("");
      setTratamiento("");
      setEvaPre(null);
      setEvaPost(null);
      setModalidades([]);
      setAsistencia("ASISTIO");
      await cargarCitas();
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  const asistio = asistencia === "ASISTIO";
  const personalizadas = modalidades.filter((m) => !MODALIDADES.includes(m));

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      {contraindicaciones && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>⚠ Contraindicaciones:</strong> {contraindicaciones}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          id="sesion-cita"
          label="Cita"
          value={citaId}
          onChange={(e) => setCitaId(e.target.value)}
          hint={citaId ? "La cita se marcará según la asistencia" : undefined}
        >
          <option value="">Sin vincular a una cita</option>
          {citas.map((c) => (
            <option key={c.id} value={c.id}>
              {format(new Date(c.fechaHoraInicio), "EEE d MMM HH:mm", { locale: es })}
              {c.esRecurrente ? ` · sesión ${c.numeroSesionEnGrupo}/${c.totalSesionesGrupo}` : ""}
            </option>
          ))}
        </Select>
        <Select id="sesion-asistencia" label="Asistencia" value={asistencia} onChange={(e) => setAsistencia(e.target.value as Asistencia)}>
          <option value="ASISTIO">Asistió</option>
          <option value="INASISTIO">No asistió</option>
          <option value="CANCELO">Canceló</option>
        </Select>
      </div>

      {asistio && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectorEva label="Dolor al llegar (EVA)" valor={evaPre} onChange={setEvaPre} />
            <SelectorEva label="Dolor al salir (EVA)" valor={evaPost} onChange={setEvaPost} />
          </div>

          <div>
            <span className="text-sm font-medium text-slate-700">Modalidades aplicadas</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[...MODALIDADES, ...personalizadas].map((m) => (
                <Chip key={m} activo={modalidades.includes(m)} onClick={() => toggleModalidad(m)}>
                  {m}
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Otra modalidad..."
                value={otraModalidad}
                onChange={(e) => setOtraModalidad(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarOtra();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={agregarOtra} disabled={!otraModalidad.trim()}>
                Añadir
              </Button>
            </div>
          </div>
        </>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium text-slate-700" htmlFor="nota-evolucion">
            Nota de evolución
          </label>
          {!nota && (
            <button type="button" onClick={() => setNota(PLANTILLA_SOAP)} className="text-xs text-lily-blue-700 hover:underline">
              Usar formato SOAP
            </button>
          )}
        </div>
        <Textarea id="nota-evolucion" rows={5} value={nota} onChange={(e) => setNota(e.target.value)} className="mt-1" />
      </div>

      <Textarea
        label="Parámetros y detalles del tratamiento"
        placeholder="Ej. TENS 20 min 100 Hz zona lumbar; US 1 MHz 1,5 W/cm² 5 min"
        value={tratamiento}
        onChange={(e) => setTratamiento(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={guardando} className="self-end">
        {guardando ? "Guardando..." : "Registrar sesión"}
      </Button>
    </form>
  );
}
