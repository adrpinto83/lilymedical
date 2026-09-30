import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { LogoInicio, VolverAlInicio } from "../../components/layout/Logo";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getErrorMessage } from "../../services/api";
import { solicitarRestablecimiento } from "../../services/recuperarPassword";

export function OlvidePasswordPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await solicitarRestablecimiento(email);
      setEnviado(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-lily-blue-50 via-white to-lily-pink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <LogoInicio className="scale-110" />
        </div>
        <h1 className="mb-1 text-center text-base font-semibold text-slate-900">¿Olvidaste tu contraseña?</h1>
        {enviado ? (
          <div className="flex flex-col gap-4 text-center text-sm text-slate-600">
            <p>
              Si <strong>{email}</strong> tiene una cuenta, en unos minutos le llegará un correo con el enlace para
              elegir una nueva contraseña.
            </p>
            <p className="text-slate-500">Revisa también la carpeta de spam. El enlace vence en 1 hora.</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-slate-500">
              Escribe tu correo y te enviaremos un enlace para restablecerla.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="email"
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={enviando} className="mt-2 w-full">
                {enviando ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>
          </>
        )}
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-lily-blue-600 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
      <VolverAlInicio />
    </div>
  );
}
