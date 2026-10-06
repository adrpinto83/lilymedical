import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { fijarSiguienteNumero, listarNumeracion, SerieNumeracion } from "../../services/perfilMedico";
import { getErrorMessage } from "../../services/api";

const numeroCompleto = (s: SerieNumeracion, n: number) => `${s.serie}-${String(n).padStart(5, "0")}`;

/**
 * Con qué número sale el próximo documento de cada tipo, por ejemplo para
 * seguir la numeración del talonario en papel. No deja repetir uno emitido.
 */
export function NumeracionCard() {
  const [series, setSeries] = useState<SerieNumeracion[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ prefijo: string; texto: string; error?: boolean } | null>(null);

  useEffect(() => {
    listarNumeracion()
      .then((lista) => {
        setSeries(lista);
        setValores(Object.fromEntries(lista.map((s) => [s.prefijo, String(s.siguiente)])));
      })
      .catch((err) => setMensaje({ prefijo: "", texto: getErrorMessage(err), error: true }));
  }, []);

  async function guardar(serie: SerieNumeracion) {
    setGuardando(serie.prefijo);
    setMensaje(null);
    try {
      const actualizada = await fijarSiguienteNumero(serie.prefijo, Number(valores[serie.prefijo]));
      setSeries((ss) => ss.map((s) => (s.prefijo === serie.prefijo ? actualizada : s)));
      setMensaje({ prefijo: serie.prefijo, texto: `El próximo saldrá como ${numeroCompleto(actualizada, actualizada.siguiente)}.` });
    } catch (err) {
      setMensaje({ prefijo: serie.prefijo, texto: getErrorMessage(err), error: true });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-slate-900">Numeración de documentos</h2>
        <p className="text-xs text-slate-500">
          Número con el que saldrá el próximo documento de cada tipo este año, por ejemplo para seguir la numeración
          del talonario en papel. No se puede usar un número que ya se emitió.
        </p>
      </CardHeader>
      <CardBody className="flex flex-col divide-y divide-slate-100 p-0">
        {mensaje && !mensaje.prefijo && <p className="p-4 text-sm text-red-600">{mensaje.texto}</p>}
        {series.map((s) => {
          const valor = Number(valores[s.prefijo]);
          const cambiado = valores[s.prefijo] !== String(s.siguiente);
          return (
            <div key={s.prefijo} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-sm">
                <p className="font-medium text-slate-900">{s.nombre}</p>
                <p className="text-xs text-slate-500">
                  Próximo: {numeroCompleto(s, Number.isInteger(valor) && valor > 0 ? valor : s.siguiente)}
                </p>
                {mensaje?.prefijo === s.prefijo && (
                  <p className={`text-xs ${mensaje.error ? "text-red-600" : "text-lily-green-700"}`}>{mensaje.texto}</p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <Input
                  aria-label={`Próximo número de ${s.nombre}`}
                  type="number"
                  min={s.minimo}
                  max={99999}
                  className="w-28"
                  value={valores[s.prefijo] ?? ""}
                  onChange={(e) => setValores((v) => ({ ...v, [s.prefijo]: e.target.value }))}
                />
                <Button
                  variant="secondary"
                  disabled={!cambiado || guardando === s.prefijo}
                  onClick={() => guardar(s)}
                >
                  {guardando === s.prefijo ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
