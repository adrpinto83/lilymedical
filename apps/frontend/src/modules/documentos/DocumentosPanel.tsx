import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Receta, ConstanciaMedica, PlanEjercicios } from "../../types";
import { listarRecetasPorPaciente, abrirPdfReceta } from "../../services/recetas";
import { listarConstanciasPorPaciente, abrirPdfConstancia } from "../../services/constancias";
import { listarPlanesPorPaciente, abrirPdfPlanEjercicios } from "../../services/planesEjercicios";
import { getErrorMessage } from "../../services/api";
import { RecetaFormModal } from "./RecetaFormModal";
import { ConstanciaFormModal } from "./ConstanciaFormModal";
import { PlanEjerciciosFormModal } from "./PlanEjerciciosFormModal";
import { ExportarHistoriaModal } from "./ExportarHistoriaModal";
import { format } from "date-fns";

export function DocumentosPanel({ pacienteId }: { pacienteId: string }) {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [constancias, setConstancias] = useState<ConstanciaMedica[]>([]);
  const [planes, setPlanes] = useState<PlanEjercicios[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recetaModalOpen, setRecetaModalOpen] = useState(false);
  const [constanciaModalOpen, setConstanciaModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [exportarModalOpen, setExportarModalOpen] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [r, c, p] = await Promise.all([
        listarRecetasPorPaciente(pacienteId),
        listarConstanciasPorPaciente(pacienteId),
        listarPlanesPorPaciente(pacienteId),
      ]);
      setRecetas(r);
      setConstancias(c);
      setPlanes(p);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [pacienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setRecetaModalOpen(true)}>+ Nueva receta</Button>
          <Button variant="secondary" onClick={() => setConstanciaModalOpen(true)}>
            + Nueva constancia
          </Button>
          <Button variant="secondary" onClick={() => setPlanModalOpen(true)}>
            + Nuevo plan de ejercicios
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setExportarModalOpen(true)}>
          📄 Exportar historia clínica completa (PDF)
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-slate-900">Recetas emitidas</h2>
        </CardHeader>
        <CardBody className="p-0">
          {recetas.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no se han emitido recetas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recetas.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.numeroReceta}{" "}
                      <Badge color={r.tipo === "MEDICAMENTO" ? "blue" : "green"}>
                        {r.tipo === "MEDICAMENTO" ? "Medicamentos" : "Orden de terapia"}
                      </Badge>
                    </p>
                    <p className="text-slate-500">
                      {format(new Date(r.fecha), "dd/MM/yyyy")} · {r.items.length} ítem(s)
                      {r.diagnostico ? ` · ${r.diagnostico}` : ""}
                      {r.fechaVencimiento ? ` · válida hasta ${format(new Date(r.fechaVencimiento), "dd/MM/yyyy")}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => abrirPdfReceta(r.id)}>
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
          {constancias.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no se han emitido constancias.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {constancias.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{c.numeroConstancia}</p>
                    <p className="text-slate-500">
                      {format(new Date(c.fecha), "dd/MM/yyyy")}
                      {c.diasReposo ? ` · ${c.diasReposo} día(s) de reposo` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => abrirPdfConstancia(c.id)}>
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
          {planes.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no se han creado planes de ejercicios.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {planes.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {format(new Date(p.fecha), "dd/MM/yyyy")} <Badge color="green">{p.items.length} ejercicio(s)</Badge>
                    </p>
                    {p.notas && <p className="text-slate-500">{p.notas}</p>}
                  </div>
                  <Button variant="ghost" onClick={() => abrirPdfPlanEjercicios(p.id)}>
                    Ver PDF
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <RecetaFormModal
        open={recetaModalOpen}
        onClose={() => setRecetaModalOpen(false)}
        onCreated={cargar}
        pacienteId={pacienteId}
      />
      <PlanEjerciciosFormModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onCreated={cargar}
        pacienteId={pacienteId}
      />
      <ConstanciaFormModal
        open={constanciaModalOpen}
        onClose={() => setConstanciaModalOpen(false)}
        onCreated={cargar}
        pacienteId={pacienteId}
      />
      <ExportarHistoriaModal
        open={exportarModalOpen}
        onClose={() => setExportarModalOpen(false)}
        pacienteId={pacienteId}
      />
    </div>
  );
}
