import { FormEvent, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { ETIQUETA_ROL, RolUsuario } from "../../types";
import {
  UsuarioPersonal,
  actualizarUsuario,
  eliminarUsuario,
  crearUsuario,
  listarPersonal,
  reiniciarPassword,
} from "../../services/usuarios";
import { getErrorMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

type RolPersonal = Exclude<RolUsuario, "PACIENTE">;

const ROLES: Array<{ valor: RolPersonal; descripcion: string }> = [
  { valor: "FISIATRA_AYUDANTE", descripcion: "Registra la evolución y el progreso de los pacientes" },
  { valor: "ADMINISTRATIVO", descripcion: "Agenda, facturación e inventario, sin acceso clínico" },
  { valor: "MEDICO", descripcion: "Acceso completo, incluidos récipes y constancias" },
  { valor: "ADMIN", descripcion: "Administrador del sistema: personal y gestión, sin acceso clínico" },
];

const COLOR_ROL: Record<RolPersonal, "blue" | "green" | "amber" | "red"> = {
  ADMIN: "red",
  MEDICO: "blue",
  FISIATRA_AYUDANTE: "green",
  ADMINISTRATIVO: "amber",
};

const vacio = { nombre: "", apellido: "", email: "", password: "", especialidad: "" };

export function PersonalPage() {
  const { user } = useAuth();
  const [personal, setPersonal] = useState<UsuarioPersonal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState(vacio);
  const [rol, setRol] = useState<RolPersonal>("FISIATRA_AYUDANTE");
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setPersonal(await listarPersonal());
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

  async function crear(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    setCreando(true);
    await ejecutar(async () => {
      await crearUsuario({
        ...form,
        rol,
        especialidad: form.especialidad || undefined,
      });
      setForm(vacio);
      setAviso("Cuenta creada. Entrégale la contraseña y pídele que la cambie al entrar.");
      await cargar();
    });
    setCreando(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Personal del consultorio</h1>
        <p className="text-sm text-slate-500">
          Cuentas de quienes trabajan contigo. Los pacientes no se crean aquí: ellos se registran
          desde el portal con su cédula.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Crear una cuenta</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={crear} className="grid gap-4 sm:grid-cols-2">
            <Input
              id="nombre"
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <Input
              id="apellido"
              label="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              required
            />
            <Input
              id="email"
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              id="password"
              label="Contraseña inicial"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              hint="Mínimo 8 caracteres. Podrá cambiarla desde su perfil."
              required
            />
            <Select
              id="rol"
              label="Rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as RolPersonal)}
              hint={ROLES.find((r) => r.valor === rol)?.descripcion}
            >
              {ROLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {ETIQUETA_ROL[r.valor]}
                </option>
              ))}
            </Select>
            <Input
              id="especialidad"
              label="Especialidad (opcional)"
              value={form.especialidad}
              onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
              hint="Ej. Terapia física, Terapia ocupacional"
            />
            <div className="sm:col-span-2">
              {aviso && <p className="mb-2 text-sm text-lily-green-700">{aviso}</p>}
              <Button type="submit" disabled={creando}>
                {creando ? "Creando..." : "Crear cuenta"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">
            Cuentas existentes <span className="font-normal text-slate-500">({personal.length})</span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {cargando ? (
            <p className="p-4 text-sm text-slate-500">Cargando...</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {personal.map((u) => (
                <li key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {u.nombre} {u.apellido}{" "}
                      <Badge color={COLOR_ROL[u.rol as RolPersonal] ?? "slate"}>
                        {ETIQUETA_ROL[u.rol]}
                      </Badge>
                      {!u.activo && <span className="ml-2 text-xs text-slate-400">(inactiva)</span>}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {u.email}
                      {u.especialidad && ` · ${u.especialidad}`}
                      {u.id === user?.id && " · eres tú"}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const nueva = prompt(
                          `Nueva contraseña para ${u.nombre} ${u.apellido} (mínimo 8 caracteres):`
                        );
                        if (!nueva) return;
                        void ejecutar(async () => {
                          await reiniciarPassword(u.id, nueva);
                          setAviso(`Contraseña de ${u.nombre} reiniciada.`);
                        });
                      }}
                    >
                      Reiniciar clave
                    </Button>
                    <Button
                      variant={u.activo ? "danger" : "secondary"}
                      disabled={u.id === user?.id}
                      title={u.id === user?.id ? "No puedes desactivar tu propia cuenta" : undefined}
                      onClick={() =>
                        ejecutar(async () => {
                          const actualizado = await actualizarUsuario(u.id, { activo: !u.activo });
                          setPersonal((prev) =>
                            prev.map((x) => (x.id === actualizado.id ? actualizado : x))
                          );
                        })
                      }
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </Button>
                    {u.rol !== "ADMIN" && u.id !== user?.id && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (!confirm(`¿Eliminar la cuenta de ${u.nombre} ${u.apellido}?`)) return;
                          void ejecutar(async () => {
                            const resultado = await eliminarUsuario(u.id);
                            setPersonal((prev) => prev.filter((x) => x.id !== u.id));
                            setAviso(
                              resultado === "eliminado"
                                ? `Cuenta de ${u.nombre} eliminada.`
                                : `Cuenta de ${u.nombre} eliminada. Su nombre se conserva en citas, sesiones y demás registros donde participó.`
                            );
                          });
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
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
