import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  misDocumentos,
  MisDocumentos,
  abrirPdfMiReceta,
  abrirPdfMiConstancia,
  abrirPdfMiPlan,
} from "../../services/portal";
import { getErrorMessage } from "../../services/api";

export function PortalDocumentosPage() {
  const [documentos, setDocumentos] = useState<MisDocumentos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    misDocumentos()
      .then(setDocumentos)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Mis documentos</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Recetas</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!documentos || documentos.recetas.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no tienes recetas emitidas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documentos.recetas.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.numeroReceta}{" "}
                      <Badge color={r.tipo === "MEDICAMENTO" ? "blue" : "green"}>
                        {r.tipo === "MEDICAMENTO" ? "Medicamentos" : "Orden de terapia"}
                      </Badge>
                    </p>
                    <p className="text-slate-500">{format(new Date(r.fecha), "dd/MM/yyyy")}</p>
                  </div>
                  <Button variant="ghost" onClick={() => abrirPdfMiReceta(r.id)}>
                    Ver PDF
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Constancias médicas</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!documentos || documentos.constancias.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no tienes constancias emitidas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documentos.constancias.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{c.numeroConstancia}</p>
                    <p className="text-slate-500">{format(new Date(c.fecha), "dd/MM/yyyy")}</p>
                  </div>
                  <Button variant="ghost" onClick={() => abrirPdfMiConstancia(c.id)}>
                    Ver PDF
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Planes de ejercicios</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!documentos || documentos.planesEjercicios.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no tienes planes de ejercicios.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documentos.planesEjercicios.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {format(new Date(p.fecha), "dd/MM/yyyy")}{" "}
                      <Badge color="green">{p.items.length} ejercicio(s)</Badge>
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => abrirPdfMiPlan(p.id)}>
                    Ver PDF
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
