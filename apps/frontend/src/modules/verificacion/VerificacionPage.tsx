import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Logo } from "../../components/layout/Logo";
import { verificarDocumento, ResultadoVerificacion } from "../../services/verificacion";
import { format } from "date-fns";

export function VerificacionPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null);

  useEffect(() => {
    if (codigo) verificarDocumento(codigo).then(setResultado);
  }, [codigo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-lily-blue-50 via-white to-lily-pink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="scale-110" />
        </div>

        {!resultado ? (
          <p className="text-sm text-slate-500">Verificando documento...</p>
        ) : resultado.valido ? (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-lily-green-100 text-2xl text-lily-green-600">
              ✓
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Documento auténtico</h1>
            <dl className="mt-4 space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Tipo</dt>
                <dd className="font-medium text-slate-900">{resultado.tipo}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">N° documento</dt>
                <dd className="font-medium text-slate-900">{resultado.numeroDocumento}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Fecha</dt>
                <dd className="font-medium text-slate-900">
                  {resultado.fecha ? format(new Date(resultado.fecha), "dd/MM/yyyy") : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Emitido por</dt>
                <dd className="font-medium text-slate-900">{resultado.medico}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
              ✕
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Documento no encontrado</h1>
            <p className="mt-2 text-sm text-slate-500">
              El código no corresponde a ningún documento emitido por LilyMedical.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
