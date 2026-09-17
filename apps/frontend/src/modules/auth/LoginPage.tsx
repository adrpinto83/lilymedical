import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-lily-blue-50 via-white to-lily-pink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="scale-110" />
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
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Eres paciente y no tienes cuenta?{" "}
          <Link to="/registro-paciente" className="font-medium text-lily-blue-600 hover:underline">
            Crea tu portal aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
