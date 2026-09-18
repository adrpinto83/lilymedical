import { FormEvent, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/Input";
import { Equipo, EquipoPayload, EstadoEquipo, actualizarEquipo, crearEquipo } from "../../services/equipos";
import { getErrorMessage } from "../../services/api";
import { CATEGORIAS_EQUIPO, aInputFecha, estadoEquipoLabel } from "./equiposUi";

const vacio = {
  nombre: "",
  categoria: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  ubicacion: "",
  fechaAdquisicion: "",
  garantiaHasta: "",
  proveedorServicio: "",
  estado: "OPERATIVO" as EstadoEquipo,
  frecuenciaMantenimientoDias: "",
  ultimoMantenimiento: "",
  notas: "",
};

type FormState = typeof vacio;

function desdeEquipo(e: Equipo): FormState {
  return {
    nombre: e.nombre,
    categoria: e.categoria ?? "",
    marca: e.marca ?? "",
    modelo: e.modelo ?? "",
    numeroSerie: e.numeroSerie ?? "",
    ubicacion: e.ubicacion ?? "",
    fechaAdquisicion: aInputFecha(e.fechaAdquisicion),
    garantiaHasta: aInputFecha(e.garantiaHasta),
    proveedorServicio: e.proveedorServicio ?? "",
    estado: e.estado,
    frecuenciaMantenimientoDias: e.frecuenciaMantenimientoDias?.toString() ?? "",
    ultimoMantenimiento: aInputFecha(e.ultimoMantenimiento),
    notas: e.notas ?? "",
  };
}

function aPayload(f: FormState): EquipoPayload {
  const texto = (v: string) => v.trim() || null;
  return {
    nombre: f.nombre.trim(),
    categoria: texto(f.categoria),
    marca: texto(f.marca),
    modelo: texto(f.modelo),
    numeroSerie: texto(f.numeroSerie),
    ubicacion: texto(f.ubicacion),
    fechaAdquisicion: texto(f.fechaAdquisicion),
    garantiaHasta: texto(f.garantiaHasta),
    proveedorServicio: texto(f.proveedorServicio),
    estado: f.estado,
    frecuenciaMantenimientoDias: f.frecuenciaMantenimientoDias ? Number(f.frecuenciaMantenimientoDias) : null,
    ultimoMantenimiento: texto(f.ultimoMantenimiento),
    notas: texto(f.notas),
  };
}

export function EquipoFormModal({
  open,
  equipo,
  onClose,
  onSaved,
}: {
  open: boolean;
  equipo: Equipo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(vacio);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(equipo ? desdeEquipo(equipo) : vacio);
      setError(null);
    }
  }, [open, equipo]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = aPayload(form);
      if (equipo) await actualizarEquipo(equipo.id, payload);
      else await crearEquipo(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={equipo ? "Editar equipo" : "Nuevo equipo"} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="eq-nombre"
            label="Nombre"
            required
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="ej. Electroestimulador TENS/EMS"
          />
          <Select
            id="eq-categoria"
            label="Categoría"
            value={form.categoria}
            onChange={(e) => set("categoria", e.target.value)}
          >
            <option value="">Sin categoría</option>
            {CATEGORIAS_EQUIPO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input id="eq-marca" label="Marca" value={form.marca} onChange={(e) => set("marca", e.target.value)} />
          <Input id="eq-modelo" label="Modelo" value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
          <Input
            id="eq-serie"
            label="N° de serie"
            value={form.numeroSerie}
            onChange={(e) => set("numeroSerie", e.target.value)}
          />
          <Input
            id="eq-ubicacion"
            label="Ubicación"
            value={form.ubicacion}
            onChange={(e) => set("ubicacion", e.target.value)}
            placeholder="ej. Cubículo 2"
          />
          <Input
            id="eq-adquisicion"
            label="Fecha de adquisición"
            type="date"
            value={form.fechaAdquisicion}
            onChange={(e) => set("fechaAdquisicion", e.target.value)}
          />
          <Input
            id="eq-garantia"
            label="Garantía hasta"
            type="date"
            value={form.garantiaHasta}
            onChange={(e) => set("garantiaHasta", e.target.value)}
          />
          <Input
            id="eq-proveedor"
            label="Técnico / empresa de servicio"
            value={form.proveedorServicio}
            onChange={(e) => set("proveedorServicio", e.target.value)}
          />
          <Select
            id="eq-estado"
            label="Estado"
            value={form.estado}
            onChange={(e) => set("estado", e.target.value as EstadoEquipo)}
          >
            {(Object.keys(estadoEquipoLabel) as EstadoEquipo[])
              .filter((k) => k !== "DADO_DE_BAJA")
              .map((k) => (
                <option key={k} value={k}>
                  {estadoEquipoLabel[k]}
                </option>
              ))}
          </Select>
        </div>

        <fieldset className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium text-slate-700">Plan de mantenimiento preventivo</legend>
          <Input
            id="eq-frecuencia"
            label="Cada cuántos días"
            type="number"
            min={1}
            value={form.frecuenciaMantenimientoDias}
            onChange={(e) => set("frecuenciaMantenimientoDias", e.target.value)}
            hint="ej. 180 = semestral, 365 = anual"
          />
          <Input
            id="eq-ultimo"
            label="Último mantenimiento"
            type="date"
            value={form.ultimoMantenimiento}
            onChange={(e) => set("ultimoMantenimiento", e.target.value)}
            hint="El próximo se calcula automáticamente"
          />
        </fieldset>

        <Textarea
          id="eq-notas"
          label="Notas"
          rows={2}
          value={form.notas}
          onChange={(e) => set("notas", e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
