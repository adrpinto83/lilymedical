import { FormEvent, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { TipoReceta } from "../../types";
import { crearReceta, abrirPdfReceta, ItemRecetaInput } from "../../services/recetas";
import { getErrorMessage } from "../../services/api";

const itemVacioMedicamento = (): ItemRecetaInput => ({
  medicamento: "",
  presentacion: "",
  dosis: "",
  frecuencia: "",
  duracion: "",
});
const itemVacioTerapia = (): ItemRecetaInput => ({
  tipoTerapia: "",
  sesiones: undefined,
  observaciones: "",
});

export function RecetaFormModal({
  open,
  onClose,
  onCreated,
  pacienteId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  pacienteId: string;
}) {
  const [tipo, setTipo] = useState<TipoReceta>("MEDICAMENTO");
  const [diagnostico, setDiagnostico] = useState("");
  const [indicacionesGenerales, setIndicacionesGenerales] = useState("");
  const [items, setItems] = useState<ItemRecetaInput[]>([itemVacioMedicamento()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function cambiarTipo(nuevoTipo: TipoReceta) {
    setTipo(nuevoTipo);
    setItems([nuevoTipo === "MEDICAMENTO" ? itemVacioMedicamento() : itemVacioTerapia()]);
  }

  function actualizarItem(index: number, cambios: Partial<ItemRecetaInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...cambios } : it)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const receta = await crearReceta({
        pacienteId,
        tipo,
        diagnostico: diagnostico || undefined,
        indicacionesGenerales: indicacionesGenerales || undefined,
        items,
      });
      onCreated();
      onClose();
      await abrirPdfReceta(receta.id);
      setTipo("MEDICAMENTO");
      setDiagnostico("");
      setIndicacionesGenerales("");
      setItems([itemVacioMedicamento()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva receta" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select label="Tipo" value={tipo} onChange={(e) => cambiarTipo(e.target.value as TipoReceta)}>
          <option value="MEDICAMENTO">Receta de medicamentos</option>
          <option value="ORDEN_TERAPIA">Orden de terapia</option>
        </Select>

        <Input label="Diagnóstico (opcional)" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-slate-700">
            {tipo === "MEDICAMENTO" ? "Medicamentos" : "Terapias indicadas"}
          </span>
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                {tipo === "MEDICAMENTO" ? (
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Medicamento"
                      required
                      value={item.medicamento}
                      onChange={(e) => actualizarItem(index, { medicamento: e.target.value })}
                    />
                    <Input
                      placeholder="Presentación (ej. Tabletas 400mg)"
                      value={item.presentacion}
                      onChange={(e) => actualizarItem(index, { presentacion: e.target.value })}
                    />
                    <Input
                      placeholder="Dosis (ej. 1 tableta)"
                      value={item.dosis}
                      onChange={(e) => actualizarItem(index, { dosis: e.target.value })}
                    />
                    <Input
                      placeholder="Frecuencia (ej. cada 8 horas)"
                      value={item.frecuencia}
                      onChange={(e) => actualizarItem(index, { frecuencia: e.target.value })}
                    />
                    <Input
                      placeholder="Duración (ej. 5 días)"
                      value={item.duracion}
                      onChange={(e) => actualizarItem(index, { duracion: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input
                      className="sm:col-span-2"
                      placeholder="Tipo de terapia (ej. Terapia física)"
                      required
                      value={item.tipoTerapia}
                      onChange={(e) => actualizarItem(index, { tipoTerapia: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="N° de sesiones"
                      value={item.sesiones ?? ""}
                      onChange={(e) =>
                        actualizarItem(index, { sesiones: e.target.value ? Number(e.target.value) : undefined })
                      }
                    />
                    <Input
                      className="sm:col-span-3"
                      placeholder="Observaciones"
                      value={item.observaciones}
                      onChange={(e) => actualizarItem(index, { observaciones: e.target.value })}
                    />
                  </div>
                )}
                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-500"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            onClick={() =>
              setItems((prev) => [...prev, tipo === "MEDICAMENTO" ? itemVacioMedicamento() : itemVacioTerapia()])
            }
          >
            + Agregar {tipo === "MEDICAMENTO" ? "medicamento" : "terapia"}
          </Button>
        </div>

        <Textarea
          label="Indicaciones generales (opcional)"
          value={indicacionesGenerales}
          onChange={(e) => setIndicacionesGenerales(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Generando..." : "Crear y abrir PDF"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
