import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input, Select, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { TipoReceta, PlantillaReceta } from "../../types";
import { crearReceta, abrirPdfReceta, ItemRecetaInput } from "../../services/recetas";
import {
  listarPlantillasReceta,
  crearPlantillaReceta,
  eliminarPlantillaReceta,
} from "../../services/plantillasReceta";
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
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [items, setItems] = useState<ItemRecetaInput[]>([itemVacioMedicamento()]);
  const [favoritos, setFavoritos] = useState<PlantillaReceta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      listarPlantillasReceta().then(setFavoritos).catch(() => setFavoritos([]));
    }
  }, [open]);

  function cambiarTipo(nuevoTipo: TipoReceta) {
    setTipo(nuevoTipo);
    setItems([nuevoTipo === "MEDICAMENTO" ? itemVacioMedicamento() : itemVacioTerapia()]);
  }

  const favoritosDelTipo = favoritos.filter((f) => f.tipo === tipo);

  function etiquetaFavorito(f: PlantillaReceta) {
    return f.tipo === "MEDICAMENTO" ? f.medicamento || "—" : f.tipoTerapia || "—";
  }

  function agregarDesdeFavorito(favorito: PlantillaReceta) {
    const { id, tipo: _tipo, ...campos } = favorito;
    setItems((prev) => [...prev, campos as ItemRecetaInput]);
  }

  async function guardarComoFavorito(item: ItemRecetaInput) {
    try {
      const nuevo = await crearPlantillaReceta({ tipo, ...item });
      setFavoritos((prev) => [nuevo, ...prev]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function quitarFavorito(id: string) {
    try {
      await eliminarPlantillaReceta(id);
      setFavoritos((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
        fechaVencimiento: fechaVencimiento || undefined,
        items,
      });
      onCreated();
      onClose();
      await abrirPdfReceta(receta.id);
      setTipo("MEDICAMENTO");
      setDiagnostico("");
      setIndicacionesGenerales("");
      setFechaVencimiento("");
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

          {favoritosDelTipo.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Favoritos:</span>
              {favoritosDelTipo.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-lily-blue-50 pl-3 pr-1.5 py-1 text-xs text-lily-blue-700"
                >
                  <button type="button" onClick={() => agregarDesdeFavorito(f)}>
                    {etiquetaFavorito(f)}
                  </button>
                  <button
                    type="button"
                    className="text-lily-blue-400 hover:text-red-500"
                    onClick={() => quitarFavorito(f.id)}
                    aria-label="Quitar favorito"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

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
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-lily-blue-600 hover:underline"
                    onClick={() => guardarComoFavorito(item)}
                    title="Guardar como favorito"
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

        <Input
          label="Válida hasta (opcional)"
          type="date"
          value={fechaVencimiento}
          onChange={(e) => setFechaVencimiento(e.target.value)}
          hint="Para tratamientos crónicos repetibles"
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
