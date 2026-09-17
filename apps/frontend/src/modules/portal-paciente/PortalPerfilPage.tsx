import { FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { obtenerMiPerfil, actualizarMiPerfil, MiPerfil } from "../../services/portal";
import { getErrorMessage } from "../../services/api";

export function PortalPerfilPage() {
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [form, setForm] = useState({
    telefono: "",
    direccion: "",
    contactoEmergenciaNombre: "",
    contactoEmergenciaTelefono: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerMiPerfil()
      .then((p) => {
        setPerfil(p);
        setForm({
          telefono: p.telefono ?? "",
          direccion: p.direccion ?? "",
          contactoEmergenciaNombre: p.contactoEmergenciaNombre ?? "",
          contactoEmergenciaTelefono: p.contactoEmergenciaTelefono ?? "",
        });
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      const actualizado = await actualizarMiPerfil(form);
      setPerfil(actualizado);
      setMensaje("Datos actualizados correctamente.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) return <p className="text-sm text-slate-500">Cargando...</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Mi perfil</h1>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Datos registrados en el consultorio</h2>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Nombre</dt>
              <dd className="text-slate-900">
                {perfil.nombres} {perfil.apellidos}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cédula</dt>
              <dd className="text-slate-900">{perfil.documento}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Fecha de nacimiento</dt>
              <dd className="text-slate-900">{format(new Date(perfil.fechaNacimiento), "dd/MM/yyyy")}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{perfil.email}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            Si alguno de estos datos es incorrecto, contacta al consultorio para corregirlo.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Datos de contacto</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              required
            />
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            />
            <Input
              label="Contacto de emergencia"
              value={form.contactoEmergenciaNombre}
              onChange={(e) => setForm((f) => ({ ...f, contactoEmergenciaNombre: e.target.value }))}
            />
            <Input
              label="Teléfono de emergencia"
              value={form.contactoEmergenciaTelefono}
              onChange={(e) => setForm((f) => ({ ...f, contactoEmergenciaTelefono: e.target.value }))}
            />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            {mensaje && <p className="text-sm text-lily-green-700 sm:col-span-2">{mensaje}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
