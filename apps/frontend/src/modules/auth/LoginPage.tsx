import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LogoInicio, VolverAlInicio } from "../../components/layout/Logo";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { HOME_POR_ROL } from "../../routes/ProtectedRoute";

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Quien ya tiene sesión y vuelve desde la página de inicio entra directo a
  // su panel en vez de ver otra vez el formulario.
  if (user) return <Navigate to={HOME_POR_ROL[user.rol]} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const usuario = await login(email, password);
      navigate(HOME_POR_ROL[usuario.rol], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-lily-blue-50 via-white to-lily-pink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <LogoInicio className="scale-110" />
        </div>
        <p className="mb-6 text-center text-sm text-slate-500">
          Sistema de gestión para consultorios de fisiatría
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            label="Correo electrónico"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
          <Link to="/olvide-password" className="text-center text-sm text-lily-blue-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Eres paciente y no tienes cuenta?{" "}
          <Link to="/registro-paciente" className="font-medium text-lily-blue-600 hover:underline">
            Crea tu portal aquí
          </Link>
        </p>
      </div>
      <VolverAlInicio />
    </div>
  );
}
