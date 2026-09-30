import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogoInicio, VolverAlInicio } from "../../components/layout/Logo";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getErrorMessage } from "../../services/api";
import { restablecerPassword } from "../../services/recuperarPassword";

export function RestablecerPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setGuardando(true);
    try {
      await restablecerPassword(token, nueva);
      setListo(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-lily-blue-50 via-white to-lily-pink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <LogoInicio className="scale-110" />
        </div>
        <h1 className="mb-4 text-center text-base font-semibold text-slate-900">Elige una nueva contraseña</h1>
        {!token ? (
          <p className="text-center text-sm text-red-600">
            El enlace está incompleto. Ábrelo directamente desde el correo o{" "}
            <Link to="/olvide-password" className="underline">
              solicita uno nuevo
            </Link>
            .
          </p>
        ) : listo ? (
          <div className="flex flex-col gap-4 text-center text-sm text-slate-600">
            <p>Tu contraseña se cambió correctamente.</p>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Iniciar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="nueva"
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              minLength={8}
              hint="Al menos 8 caracteres"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
            <Input
              id="confirmar"
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
            {error && (
              <p className="text-sm text-red-600">
                {error}{" "}
                {error.includes("enlace") && (
                  <Link to="/olvide-password" className="underline">
                    Solicitar otro
                  </Link>
                )}
              </p>
            )}
            <Button type="submit" disabled={guardando} className="mt-2 w-full">
              {guardando ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </div>
      <VolverAlInicio />
    </div>
  );
}
