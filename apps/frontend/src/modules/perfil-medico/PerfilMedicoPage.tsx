import { FormEvent, useEffect, useRef, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PerfilMedico } from "../../types";
import { obtenerPerfilMedico, actualizarPerfilMedico, subirFirma } from "../../services/perfilMedico";
import { getErrorMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export function PerfilMedicoPage() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilMedico | null>(null);
  const [form, setForm] = useState({
    colegiatura: "",
    cma: "",
    rif: "",
    instagram: "",
    tituloProfesional: "",
    nombreConsultorio: "",
    direccionConsultorio: "",
    telefonoConsultorio: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [subiendoFirma, setSubiendoFirma] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    const p = await obtenerPerfilMedico();
    setPerfil(p);
    setForm({
      colegiatura: p.colegiatura ?? "",
      cma: p.cma ?? "",
      rif: p.rif ?? "",
      instagram: p.instagram ?? "",
      tituloProfesional: p.tituloProfesional ?? "",
      nombreConsultorio: p.nombreConsultorio,
      direccionConsultorio: p.direccionConsultorio ?? "",
      telefonoConsultorio: p.telefonoConsultorio ?? "",
    });
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMensaje(null);
    try {
      const p = await actualizarPerfilMedico(form);
      setPerfil(p);
      setMensaje("Perfil actualizado.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendoFirma(true);
    setError(null);
    try {
      const p = await subirFirma(archivo);
      setPerfil(p);
      setMensaje("Firma actualizada.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubiendoFirma(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!perfil) return <p className="text-sm text-slate-500">Cargando...</p>;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Mi perfil médico</h1>
        <p className="text-sm text-slate-500">
          Estos datos aparecen en el membrete y la firma de las recetas, órdenes de terapia,
          constancias e historias clínicas que emitas.
        </p>
      </div>

      <Card>
        <CardBody className="flex items-center gap-4">
          <img src="/logo-icon.png" alt="Logo del consultorio" className="h-16 w-16 object-contain" />
          <div>
            <p className="text-base font-bold text-lily-blue-800">
              Dra. {user?.nombre} <span className="block leading-tight">{user?.apellido}</span>
            </p>
            <p className="text-xs font-medium text-pink-400">{form.tituloProfesional || "—"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {[
                form.colegiatura && `MPPS: ${form.colegiatura}`,
                form.cma && `CMA: ${form.cma}`,
                form.rif && `RIF: ${form.rif}`,
              ]
                .filter(Boolean)
                .join("  ·  ") || "Completa tus credenciales abajo"}
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Membrete</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="N° MPPS"
              value={form.colegiatura}
              onChange={(e) => setForm((f) => ({ ...f, colegiatura: e.target.value }))}
            />
            <Input
              label="N° CMA (Colegio de Médicos)"
              value={form.cma}
              onChange={(e) => setForm((f) => ({ ...f, cma: e.target.value }))}
            />
            <Input
              label="RIF"
              value={form.rif}
              onChange={(e) => setForm((f) => ({ ...f, rif: e.target.value }))}
              placeholder="V-00000000-0"
            />
            <Input
              label="Título profesional"
              value={form.tituloProfesional}
              onChange={(e) => setForm((f) => ({ ...f, tituloProfesional: e.target.value }))}
              placeholder="ej. Médico Fisiatra"
            />
            <Input
              label="Instagram"
              value={form.instagram}
              onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              placeholder="@usuario"
            />
            <Input
              label="Teléfono del consultorio"
              value={form.telefonoConsultorio}
              onChange={(e) => setForm((f) => ({ ...f, telefonoConsultorio: e.target.value }))}
            />
            <Input
              className="sm:col-span-2"
              label="Dirección del consultorio"
              value={form.direccionConsultorio}
              onChange={(e) => setForm((f) => ({ ...f, direccionConsultorio: e.target.value }))}
            />

            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            {mensaje && <p className="text-sm text-lily-green-600 sm:col-span-2">{mensaje}</p>}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Firma digital</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
            {perfil.firmaUrl ? (
              <img
                src={`/uploads/firmas/${perfil.firmaUrl}`}
                alt="Firma del médico"
                className="max-h-20 max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-400">Sin firma cargada</span>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFirmaChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={subiendoFirma}
              onClick={() => fileInputRef.current?.click()}
            >
              {subiendoFirma ? "Subiendo..." : perfil.firmaUrl ? "Cambiar firma" : "Subir firma"}
            </Button>
            <p className="mt-2 text-xs text-slate-500">PNG, JPG o WEBP. Se estampa automáticamente en cada documento.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
