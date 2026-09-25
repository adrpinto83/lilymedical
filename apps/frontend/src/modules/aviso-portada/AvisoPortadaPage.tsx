import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { VentanaAviso } from "../landing/AvisoPortada";
import {
  AvisoPortadaGestion,
  AvisoPortadaInput,
  actualizarAviso,
  cambiarAvisoActivo,
  crearAviso,
  eliminarAviso,
  listarAvisos,
} from "../../services/avisosPortada";
import { getErrorMessage } from "../../services/api";

const formularioVacio = {
  etiqueta: "",
  titulo: "",
  mensaje: "",
  firma: "",
  textoBoton: "Entrar al sitio",
  enlaceUrl: "",
  enlaceTexto: "",
};

type Formulario = typeof formularioVacio;

function aFormulario(aviso: AvisoPortadaGestion): Formulario {
  return {
    etiqueta: aviso.etiqueta ?? "",
    titulo: aviso.titulo,
    mensaje: aviso.mensaje,
    firma: aviso.firma ?? "",
    textoBoton: aviso.textoBoton,
    enlaceUrl: aviso.enlaceUrl ?? "",
    enlaceTexto: aviso.enlaceTexto ?? "",
  };
}

export function AvisoPortadaPage() {
  const [avisos, setAvisos] = useState<AvisoPortadaGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null: cerrado; "nuevo": creando; un aviso: editándolo.
  const [editando, setEditando] = useState<AvisoPortadaGestion | "nuevo" | null>(null);
  const [previa, setPrevia] = useState<AvisoPortadaGestion | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      setAvisos(await listarAvisos());
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

  async function ejecutar(accion: () => Promise<void>) {
    try {
      await accion();
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const activo = avisos.find((a) => a.activo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Aviso de portada</h1>
          <p className="text-sm text-slate-500">
            Ventana que aparece al entrar a la página de inicio, una vez por visita. Solo puede
            haber uno activo; activar otro reemplaza al actual.
          </p>
        </div>
        <Button onClick={() => setEditando("nuevo")}>Nuevo aviso comercial</Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            {cargando
              ? "Cargando..."
              : activo
                ? <>La portada muestra: <strong>{activo.titulo}</strong></>
                : "La portada no muestra ningún aviso emergente."}
          </p>
          {activo && (
            <Button
              variant="secondary"
              onClick={() => ejecutar(async () => setAvisos(await cambiarAvisoActivo(activo.id, false)))}
            >
              Desactivar aviso
            </Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Avisos guardados</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!cargando && avisos.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Todavía no hay avisos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {avisos.map((aviso) => {
                const historico = aviso.tipo === "DEDICATORIA";
                return (
                  <li key={aviso.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{aviso.titulo}</p>
                        <Badge color={aviso.activo ? "green" : "slate"}>
                          {aviso.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        {historico ? (
                          <Badge color="amber">Dedicatoria · histórico</Badge>
                        ) : (
                          <Badge color="blue">Comercial</Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{aviso.mensaje}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button variant="secondary" onClick={() => setPrevia(aviso)}>
                        Vista previa
                      </Button>
                      <Button
                        variant={aviso.activo ? "secondary" : "primary"}
                        onClick={() =>
                          ejecutar(async () => setAvisos(await cambiarAvisoActivo(aviso.id, !aviso.activo)))
                        }
                      >
                        {aviso.activo ? "Desactivar" : "Activar"}
                      </Button>
                      {!historico && (
                        <>
                          <Button variant="secondary" onClick={() => setEditando(aviso)}>
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              if (!confirm(`¿Eliminar el aviso "${aviso.titulo}"?`)) return;
                              void ejecutar(async () => {
                                await eliminarAviso(aviso.id);
                                setAvisos((prev) => prev.filter((a) => a.id !== aviso.id));
                              });
                            }}
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {editando && (
        <FormularioAviso
          aviso={editando === "nuevo" ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => {
            setEditando(null);
            await cargar();
          }}
        />
      )}

      {previa && <VentanaAviso aviso={previa} onCerrar={() => setPrevia(null)} vistaPrevia />}
    </div>
  );
}

function FormularioAviso({
  aviso,
  onCerrar,
  onGuardado,
}: {
  aviso: AvisoPortadaGestion | null;
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [form, setForm] = useState<Formulario>(aviso ? aFormulario(aviso) : formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campo = (nombre: keyof Formulario) => ({
    id: `aviso-${nombre}`,
    value: form[nombre],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [nombre]: e.target.value })),
  });

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const datos: AvisoPortadaInput = { ...form, textoBoton: form.textoBoton.trim() || undefined };
      if (aviso) await actualizarAviso(aviso.id, datos);
      else await crearAviso(datos);
      await onGuardado();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open onClose={onCerrar} title={aviso ? "Editar aviso" : "Nuevo aviso comercial"} wide>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Etiqueta" hint='Texto pequeño sobre el título, p. ej. "Promoción"' {...campo("etiqueta")} />
          <Input label="Título" required maxLength={120} {...campo("titulo")} />
        </div>
        <Textarea
          label="Mensaje"
          required
          rows={5}
          maxLength={2000}
          hint="Deja una línea en blanco para separar párrafos"
          {...campo("mensaje")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Firma" hint="Opcional" {...campo("firma")} />
          <Input label="Texto del botón de cierre" maxLength={40} {...campo("textoBoton")} />
          <Input
            label="Enlace del botón de acción"
            hint="Opcional: https://wa.me/584246773472, #servicios, /registro-paciente..."
            {...campo("enlaceUrl")}
          />
          <Input label="Texto del botón de acción" maxLength={40} {...campo("enlaceTexto")} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
