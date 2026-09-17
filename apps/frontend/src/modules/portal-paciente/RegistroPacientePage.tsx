import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";

export function RegistroPacientePage() {
  const { registrarPaciente, loading } = useAuth();
  const navigate = useNavigate();
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      await registrarPaciente(documento, email, password);
      navigate("/portal", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-lily-blue-50 via-white to-lily-pink-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="scale-110" />
        </div>
        <h1 className="mb-1 text-center text-base font-semibold text-slate-900">Portal del paciente</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Crea tu cuenta para ver tus citas, recetas y constancias.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="documento"
            label="Cédula"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            hint="La misma con la que estás registrado en el consultorio"
            required
          />
          <Input
            id="email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Debe coincidir con el email que dejaste en el consultorio"
            required
          />
          <Input
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            id="confirmar"
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-lily-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
