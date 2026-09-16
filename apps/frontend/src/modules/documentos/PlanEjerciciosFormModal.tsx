import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { PlantillaEjercicio } from "../../types";
import { listarPlantillasEjercicio, crearPlantillaEjercicio } from "../../services/plantillasEjercicio";
import { crearPlanEjercicios, abrirPdfPlanEjercicios, ItemPlanEjercicioInput } from "../../services/planesEjercicios";
import { getErrorMessage } from "../../services/api";

const itemVacio = (): ItemPlanEjercicioInput => ({ nombre: "", descripcion: "", repeticionesSugeridas: "" });

export function PlanEjerciciosFormModal({
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
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemPlanEjercicioInput[]>([itemVacio()]);
  const [catalogo, setCatalogo] = useState<PlantillaEjercicio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listarPlantillasEjercicio().then(setCatalogo).catch(() => setCatalogo([]));
    }
  }, [open]);

  function actualizarItem(index: number, cambios: Partial<ItemPlanEjercicioInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...cambios } : it)));
  }

  function agregarDesdeCatalogo(ejercicio: PlantillaEjercicio) {
    setItems((prev) => [
      ...prev,
      {
        nombre: ejercicio.nombre,
        descripcion: ejercicio.descripcion ?? "",
        repeticionesSugeridas: ejercicio.repeticionesSugeridas ?? "",
      },
    ]);
  }

  async function guardarEnCatalogo(item: ItemPlanEjercicioInput) {
    if (!item.nombre.trim()) return;
    try {
      const nuevo = await crearPlantillaEjercicio({
        nombre: item.nombre,
        descripcion: item.descripcion || undefined,
        repeticionesSugeridas: item.repeticionesSugeridas || undefined,
      });
      setCatalogo((prev) => [...prev, nuevo]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const plan = await crearPlanEjercicios(pacienteId, {
        notas: notas || undefined,
        items: items.filter((it) => it.nombre.trim()),
      });
      onCreated();
      onClose();
      await abrirPdfPlanEjercicios(plan.id);
      setNotas("");
      setItems([itemVacio()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo plan de ejercicios" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {catalogo.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Catálogo:</span>
            {catalogo.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => agregarDesdeCatalogo(c)}
                className="rounded-full bg-lily-green-50 px-3 py-1 text-xs text-lily-green-700 hover:bg-lily-green-100"
              >
                + {c.nombre}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-slate-700">Ejercicios</span>
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    className="sm:col-span-2"
                    placeholder="Nombre del ejercicio (ej. Estiramiento de isquiotibiales)"
                    required
                    value={item.nombre}
                    onChange={(e) => actualizarItem(index, { nombre: e.target.value })}
                  />
                  <Input
                    placeholder="Repeticiones (ej. 3 series x 15 reps)"
                    value={item.repeticionesSugeridas}
                    onChange={(e) => actualizarItem(index, { repeticionesSugeridas: e.target.value })}
                  />
                  <Input
                    placeholder="Descripción / técnica"
                    value={item.descripcion}
                    onChange={(e) => actualizarItem(index, { descripcion: e.target.value })}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-lily-blue-600 hover:underline"
                    onClick={() => guardarEnCatalogo(item)}
                    title="Guardar en el catálogo"
                  >
                    ☆ Guardar
                  </button>
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
            </div>
          ))}
          <Button type="button" variant="ghost" className="self-start" onClick={() => setItems((prev) => [...prev, itemVacio()])}>
            + Agregar ejercicio
          </Button>
        </div>

        <Textarea label="Notas para el paciente (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />

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
