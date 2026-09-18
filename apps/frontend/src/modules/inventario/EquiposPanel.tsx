import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Equipo, darDeBajaEquipo, listarEquipos } from "../../services/equipos";
import { getErrorMessage } from "../../services/api";
import { EquipoFormModal } from "./EquipoFormModal";
import { EquipoDetalleModal } from "./EquipoDetalleModal";
import { alertaMantenimiento, estadoEquipoColor, estadoEquipoLabel } from "./equiposUi";

export function EquiposPanel() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [incluirBajas, setIncluirBajas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Equipo | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const cargar = useCallback(() => {
    listarEquipos(incluirBajas)
      .then(setEquipos)
      .catch((err) => setError(getErrorMessage(err)));
  }, [incluirBajas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function handleBaja(equipo: Equipo) {
    if (!window.confirm(`¿Dar de baja "${equipo.nombre}"? Se conserva su historial de mantenimientos.`)) return;
    try {
      await darDeBajaEquipo(equipo.id);
      cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Equipos</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={incluirBajas} onChange={(e) => setIncluirBajas(e.target.checked)} />
            Mostrar dados de baja
          </label>
          <Button
            onClick={() => {
              setEditando(null);
              setFormOpen(true);
            }}
          >
            + Nuevo equipo
          </Button>
        </div>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        {equipos.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No hay equipos registrados. Agrega las máquinas del consultorio para llevar su mantenimiento.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Próximo mantenimiento</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipos.map((eq) => {
                const alerta = alertaMantenimiento(eq.proximoMantenimiento);
                const deBaja = eq.estado === "DADO_DE_BAJA";
                return (
                  <tr key={eq.id} className={deBaja ? "opacity-60" : undefined}>
                    <td className="px-4 py-3">
                      <button
                        className="text-left font-medium text-lily-blue-700 hover:underline"
                        onClick={() => setDetalleId(eq.id)}
                      >
                        {eq.nombre}
                      </button>
                      <p className="text-xs text-slate-500">
                        {[eq.categoria, eq.marca, eq.modelo].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{eq.ubicacion || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge color={estadoEquipoColor[eq.estado]}>{estadoEquipoLabel[eq.estado]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {deBaja ? "—" : <Badge color={alerta.color}>{alerta.texto}</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => setDetalleId(eq.id)}>
                          Mantenimiento
                        </Button>
                        {!deBaja && (
                          <>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setEditando(eq);
                                setFormOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button variant="ghost" onClick={() => handleBaja(eq)}>
                              Dar de baja
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardBody>

      <EquipoFormModal open={formOpen} equipo={editando} onClose={() => setFormOpen(false)} onSaved={cargar} />
      <EquipoDetalleModal equipoId={detalleId} onClose={() => setDetalleId(null)} onChanged={cargar} />
    </Card>
  );
}
