import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Paciente } from "../../types";
import { listarPacientes } from "../../services/pacientes";
import { getErrorMessage } from "../../services/api";
import { PacienteFormModal } from "./PacienteFormModal";

export function PacientesListPage() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cargar = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      setPacientes(await listarPacientes(q));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const timeout = setTimeout(() => cargar(busqueda || undefined), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  function calcularEdad(fechaNacimiento: string) {
    const nacimiento = new Date(fechaNacimiento);
    const diff = Date.now() - nacimiento.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">Busca por nombre, documento o teléfono</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nuevo paciente</Button>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Input
            placeholder="Buscar paciente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Cargando...</p>
          ) : pacientes.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No se encontraron pacientes.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Edad</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Aseguradora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pacientes.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-lily-blue-50"
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.apellidos}, {p.nombres}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.documento}</td>
                    <td className="px-4 py-3 text-slate-600">{calcularEdad(p.fechaNacimiento)} años</td>
                    <td className="px-4 py-3 text-slate-600">{p.telefono}</td>
                    <td className="px-4 py-3 text-slate-600">{p.aseguradora?.nombre ?? "Particular"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <PacienteFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(p) => {
          setPacientes((prev) => [p, ...prev]);
          navigate(`/pacientes/${p.id}`);
        }}
      />
    </div>
  );
}
