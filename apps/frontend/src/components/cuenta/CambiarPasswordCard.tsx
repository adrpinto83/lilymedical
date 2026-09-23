import { FormEvent, useState } from "react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cambiarMiPassword } from "../../services/usuarios";
import { getErrorMessage } from "../../services/api";

const MINIMO = 8;

/**
 * Cambio de la contraseña propia. Sirve para cualquier rol, así que vive en
 * `components/` y lo usan tanto el perfil del personal como el del paciente.
 */
export function CambiarPasswordCard() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setListo(false);

    if (nueva.length < MINIMO) {
      setError(`La nueva contraseña debe tener al menos ${MINIMO} caracteres`);
      return;
    }
    if (nueva !== confirmar) {
      setError("La nueva contraseña y su confirmación no coinciden");
      return;
    }

    setGuardando(true);
    try {
      await cambiarMiPassword(actual, nueva);
      setListo(true);
      setActual("");
      setNueva("");
      setConfirmar("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Cambiar contraseña</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={enviar} className="flex max-w-sm flex-col gap-4">
          <Input
            id="password-actual"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />
          <Input
            id="password-nueva"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            hint={`Mínimo ${MINIMO} caracteres`}
            required
          />
          <Input
            id="password-confirmar"
            label="Repite la nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {listo && (
            <p className="text-sm text-lily-green-700">
              Contraseña actualizada. Se usará la nueva la próxima vez que inicies sesión.
            </p>
          )}

          <Button type="submit" disabled={guardando} className="self-start">
            {guardando ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
