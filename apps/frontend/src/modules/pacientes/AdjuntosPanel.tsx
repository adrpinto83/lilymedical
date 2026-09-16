import { FormEvent, useEffect, useRef, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select, Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Adjunto, HistoriaClinica } from "../../types";
import { obtenerHistoriaPorPaciente } from "../../services/historiasClinicas";
import { subirAdjunto, obtenerArchivoAdjunto, eliminarAdjunto } from "../../services/adjuntos";
import { getErrorMessage } from "../../services/api";
import { format } from "date-fns";

const CATEGORIAS = [
  "Radiografía",
  "Resonancia magnética",
  "Tomografía",
  "Ecografía",
  "Foto de postura",
  "Foto de herida / lesión",
  "Informe de laboratorio",
  "Otro",
];

export function AdjuntosPanel({ pacienteId }: { pacienteId: string }) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [descripcion, setDescripcion] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlsCreadas = useRef<string[]>([]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const historia: HistoriaClinica = await obtenerHistoriaPorPaciente(pacienteId);
      setAdjuntos(historia.adjuntos);

      const imagenes = historia.adjuntos.filter((a) => a.tipo === "IMAGEN");
      const entradas = await Promise.all(
        imagenes.map(async (a) => {
          try {
            const blob = await obtenerArchivoAdjunto(a.id);
            const url = URL.createObjectURL(blob);
            urlsCreadas.current.push(url);
            return [a.id, url] as const;
          } catch {
            return null;
          }
        })
      );
      setMiniaturas(Object.fromEntries(entradas.filter((e): e is readonly [string, string] => e !== null)));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    return () => {
      urlsCreadas.current.forEach((url) => URL.revokeObjectURL(url));
      urlsCreadas.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  async function handleSubir(e: FormEvent) {
    e.preventDefault();
    const archivo = fileInputRef.current?.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      await subirAdjunto(pacienteId, archivo, { categoria, descripcion: descripcion || undefined });
      setDescripcion("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubiendo(false);
    }
  }

  async function handleVer(adjunto: Adjunto) {
    if (adjunto.tipo === "IMAGEN" && miniaturas[adjunto.id]) {
      setLightbox(miniaturas[adjunto.id]);
      return;
    }
    try {
      const blob = await obtenerArchivoAdjunto(adjunto.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este archivo? Esta acción no se puede deshacer.")) return;
    try {
      await eliminarAdjunto(id);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Subir imagen o estudio</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubir} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Archivo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                capture="environment"
                required
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-lily-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-lily-blue-700 hover:file:bg-lily-blue-100"
              />
            </div>
            <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <div className="flex items-end">
              <Button type="submit" disabled={subiendo} className="w-full sm:w-auto">
                {subiendo ? "Subiendo..." : "Subir"}
              </Button>
            </div>
            <Input
              label="Descripción (opcional)"
              className="sm:col-span-3"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="ej. Rodilla derecha, control post-quirúrgico"
            />
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Estudios y documentos ({adjuntos.length})</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : adjuntos.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no se han subido imágenes ni documentos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {adjuntos.map((a) => (
                <div key={a.id} className="flex flex-col overflow-hidden rounded-lg border border-slate-200">
                  <button
                    onClick={() => handleVer(a)}
                    className="flex aspect-square items-center justify-center bg-slate-50"
                  >
                    {a.tipo === "IMAGEN" && miniaturas[a.id] ? (
                      <img src={miniaturas[a.id]} alt={a.nombreArchivo} className="h-full w-full object-cover" />
                    ) : a.tipo === "IMAGEN" ? (
                      <span className="text-xs text-slate-400">Cargando...</span>
                    ) : (
                      <span className="text-4xl">📄</span>
                    )}
                  </button>
                  <div className="flex flex-1 flex-col gap-1 p-2">
                    {a.categoria && (
                      <Badge color="blue">{a.categoria}</Badge>
                    )}
                    <p className="truncate text-xs font-medium text-slate-700" title={a.nombreArchivo}>
                      {a.nombreArchivo}
                    </p>
                    {a.descripcion && <p className="line-clamp-2 text-xs text-slate-500">{a.descripcion}</p>}
                    <p className="text-xs text-slate-400">{format(new Date(a.createdAt), "dd/MM/yyyy")}</p>
                    <div className="mt-auto flex justify-end">
                      <Button variant="ghost" className="px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => handleEliminar(a.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Vista ampliada" className="max-h-full max-w-full rounded-lg shadow-xl" />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 hover:bg-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
