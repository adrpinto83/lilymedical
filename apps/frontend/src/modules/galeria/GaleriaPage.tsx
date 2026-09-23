import { FormEvent, useEffect, useRef, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import {
  FotoGaleriaGestion,
  actualizarFotoGaleria,
  eliminarFotoGaleria,
  listarGaleriaGestion,
  reordenarGaleria,
  subirFotoGaleria,
} from "../../services/galeria";
import { getErrorMessage } from "../../services/api";

export function GaleriaPage() {
  const [fotos, setFotos] = useState<FotoGaleriaGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pie, setPie] = useState("");
  const inputArchivo = useRef<HTMLInputElement>(null);

  async function cargar() {
    setCargando(true);
    try {
      setFotos(await listarGaleriaGestion());
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  /** Envuelve una acción para no repetir el manejo de errores en cada botón. */
  async function ejecutar(accion: () => Promise<void>) {
    try {
      await accion();
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function subir(e: FormEvent) {
    e.preventDefault();
    const archivo = inputArchivo.current?.files?.[0];
    if (!archivo) {
      setError("Elige una imagen antes de subirla");
      return;
    }
    setSubiendo(true);
    await ejecutar(async () => {
      await subirFotoGaleria(archivo, pie);
      setPie("");
      if (inputArchivo.current) inputArchivo.current.value = "";
      await cargar();
    });
    setSubiendo(false);
  }

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= fotos.length) return;
    const orden = [...fotos];
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    setFotos(orden); // respuesta inmediata; el servidor confirma debajo
    void ejecutar(async () => {
      setFotos(await reordenarGaleria(orden.map((f) => f.id)));
    });
  }

  const visibles = fotos.filter((f) => f.visible).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Galería del sitio web</h1>
        <p className="text-sm text-slate-500">
          Estas fotos son las que ven los pacientes en la página de inicio. Mientras no haya
          ninguna, la página muestra las imágenes de archivo que trae el sistema.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Subir una foto</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={subir} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="archivo" className="mb-1 block text-sm font-medium text-slate-700">
                Imagen
              </label>
              <input
                id="archivo"
                ref={inputArchivo}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-lily-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-lily-blue-700 hover:file:bg-lily-blue-100"
              />
              <p className="mt-1 text-xs text-slate-500">
                JPG, PNG, WEBP o AVIF, hasta 8 MB. Horizontal queda mejor.
              </p>
            </div>
            <div className="flex-1">
              <Input
                id="pie"
                label="Pie de foto"
                value={pie}
                onChange={(e) => setPie(e.target.value)}
                hint="Si lo dejas vacío se usa el nombre del archivo"
              />
            </div>
            <Button type="submit" disabled={subiendo}>
              {subiendo ? "Subiendo..." : "Subir"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Fotos cargadas{" "}
            <span className="font-normal text-slate-500">
              ({visibles} visible{visibles === 1 ? "" : "s"} de {fotos.length})
            </span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {cargando ? (
            <p className="p-4 text-sm text-slate-500">Cargando...</p>
          ) : fotos.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              Todavía no has subido ninguna foto. La página de inicio muestra mientras tanto las
              imágenes de archivo.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {fotos.map((foto, i) => (
                <li key={foto.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <img
                    src={foto.url}
                    alt={foto.pie}
                    className="h-20 w-28 shrink-0 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <FilaPie
                      key={foto.pie}
                      foto={foto}
                      onGuardar={(nuevoPie) =>
                        ejecutar(async () => {
                          const actualizada = await actualizarFotoGaleria(foto.id, { pie: nuevoPie });
                          setFotos((prev) =>
                            prev.map((f) => (f.id === actualizada.id ? actualizada : f))
                          );
                        })
                      }
                    />
                    <p className="mt-1 truncate text-xs text-slate-400">{foto.nombreOriginal}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge color={foto.visible ? "green" : "slate"}>
                      {foto.visible ? "Visible" : "Oculta"}
                    </Badge>
                    <Button
                      variant="secondary"
                      aria-label={`Mover ${foto.pie} hacia arriba`}
                      disabled={i === 0}
                      onClick={() => mover(i, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label={`Mover ${foto.pie} hacia abajo`}
                      disabled={i === fotos.length - 1}
                      onClick={() => mover(i, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        ejecutar(async () => {
                          const actualizada = await actualizarFotoGaleria(foto.id, {
                            visible: !foto.visible,
                          });
                          setFotos((prev) =>
                            prev.map((f) => (f.id === actualizada.id ? actualizada : f))
                          );
                        })
                      }
                    >
                      {foto.visible ? "Ocultar" : "Mostrar"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (!confirm(`¿Eliminar "${foto.pie}" de la galería?`)) return;
                        void ejecutar(async () => {
                          await eliminarFotoGaleria(foto.id);
                          setFotos((prev) => prev.filter((f) => f.id !== foto.id));
                        });
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/** Pie editable: guarda al salir del campo, y solo si cambió. */
function FilaPie({
  foto,
  onGuardar,
}: {
  foto: FotoGaleriaGestion;
  onGuardar: (pie: string) => Promise<void>;
}) {
  // El `key` del padre remonta este campo cuando el pie cambia en el servidor,
  // así que basta con inicializar el estado una vez.
  const [valor, setValor] = useState(foto.pie);

  return (
    <Input
      id={`pie-${foto.id}`}
      label="Pie de foto"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        const limpio = valor.trim();
        if (!limpio || limpio === foto.pie) {
          setValor(foto.pie);
          return;
        }
        void onGuardar(limpio);
      }}
    />
  );
}
