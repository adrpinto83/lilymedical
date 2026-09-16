import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import clsx from "clsx";
import { Card, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Paciente } from "../../types";
import { obtenerPaciente } from "../../services/pacientes";
import { useAuth } from "../../context/AuthContext";
import { PacienteFormModal } from "./PacienteFormModal";
import { HistoriaClinicaPanel } from "./HistoriaClinicaPanel";
import { EstadoCuentaPanel } from "./EstadoCuentaPanel";
import { AdjuntosPanel } from "./AdjuntosPanel";
import { PacienteAseguradorasPanel } from "./PacienteAseguradorasPanel";
import { AutorizacionesPanel } from "./AutorizacionesPanel";
import { DocumentosPanel } from "../documentos/DocumentosPanel";
import { format } from "date-fns";

type Tab = "datos" | "clinico" | "estudios" | "documentos" | "seguros" | "facturacion";

export function PacienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [tab, setTab] = useState<Tab>("datos");
  const [editOpen, setEditOpen] = useState(false);

  const puedeVerClinico = user?.rol === "MEDICO";

  useEffect(() => {
    if (id) obtenerPaciente(id).then(setPaciente);
  }, [id]);

  if (!paciente || !id) return <p className="text-sm text-slate-500">Cargando...</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "datos", label: "Datos generales" },
    ...(puedeVerClinico ? [{ key: "clinico" as Tab, label: "Historia clínica" }] : []),
    ...(puedeVerClinico ? [{ key: "estudios" as Tab, label: "Imágenes y estudios" }] : []),
    ...(puedeVerClinico ? [{ key: "documentos" as Tab, label: "Documentos" }] : []),
    { key: "seguros", label: "Seguros" },
    { key: "facturacion", label: "Facturación" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/pacientes" className="text-xs text-lily-blue-600 hover:underline">
            ← Volver a pacientes
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {paciente.apellidos}, {paciente.nombres}
          </h1>
          <p className="text-sm text-slate-500">
            {paciente.documento} · {format(new Date(paciente.fechaNacimiento), "dd/MM/yyyy")}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          Editar datos
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-lily-blue-600 text-lily-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "datos" && (
        <Card>
          <CardBody>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Teléfono</dt>
                <dd className="text-slate-900">{paciente.telefono}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="text-slate-900">{paciente.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Dirección</dt>
                <dd className="text-slate-900">{paciente.direccion || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Contacto de emergencia</dt>
                <dd className="text-slate-900">
                  {paciente.contactoEmergenciaNombre || "—"}{" "}
                  {paciente.contactoEmergenciaTelefono && `(${paciente.contactoEmergenciaTelefono})`}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      )}

      {tab === "clinico" && puedeVerClinico && <HistoriaClinicaPanel pacienteId={id} />}

      {tab === "estudios" && puedeVerClinico && <AdjuntosPanel pacienteId={id} />}

      {tab === "documentos" && puedeVerClinico && <DocumentosPanel pacienteId={id} />}

      {tab === "seguros" && (
        <div className="flex flex-col gap-6">
          <PacienteAseguradorasPanel pacienteId={id} />
          <AutorizacionesPanel pacienteId={id} />
        </div>
      )}

      {tab === "facturacion" && <EstadoCuentaPanel pacienteId={id} />}

      <PacienteFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        paciente={paciente}
        onSaved={setPaciente}
      />
    </div>
  );
}
