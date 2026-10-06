import { FormEvent, useEffect, useState } from "react";
import { differenceInYears } from "date-fns";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { HistoriaClinica, Paciente } from "../../types";
import { crearInformeMedico, abrirPdfInformeMedico } from "../../services/informesMedicos";
import { obtenerHistoriaPorPaciente } from "../../services/historiasClinicas";
import { obtenerPaciente } from "../../services/pacientes";
import { getErrorMessage } from "../../services/api";

/**
 * Borrador con la frase con que suelen empezar los informes a mano ("Se
 * trata de paciente masculino de 65 años de edad, quien acude con IDX: ...")
 * y el examen y plan de la historia, para que el médico solo lo ajuste.
 */
export function borradorInforme(paciente: Paciente, historia: HistoriaClinica | null) {
  const sexo = paciente.sexo === "MASCULINO" ? "masculino" : paciente.sexo === "FEMENINO" ? "femenino" : "";
  const edad = differenceInYears(new Date(), new Date(paciente.fechaNacimiento.slice(0, 10) + "T12:00:00"));
  const partes = [
    `Se trata de paciente${sexo ? ` ${sexo}` : ""} de ${edad} años de edad, quien acude con IDX: ${
      historia?.diagnosticoPrincipal || "..."
    }.`,
  ];
  if (historia?.examenFisico) partes.push(`Al examen físico: ${historia.examenFisico}`);
  return { informe: partes.join("\n"), indicaciones: historia?.planTerapeutico ?? "" };
}

export function InformeMedicoFormModal({
  open,
  onClose,
  onCreated,
  pacienteId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  pacienteId: string;
}) {
  const [informe, setInforme] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cada apertura parte de un borrador armado con la historia del paciente.
  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([obtenerPaciente(pacienteId), obtenerHistoriaPorPaciente(pacienteId).catch(() => null)])
      .then(([paciente, historia]) => {
        const borrador = borradorInforme(paciente, historia);
        setInforme(borrador.informe);
        setIndicaciones(borrador.indicaciones);
      })
      .catch(() => {
        setInforme("");
        setIndicaciones("");
      });
  }, [open, pacienteId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const creado = await crearInformeMedico({
        pacienteId,
        informe,
        indicaciones: indicaciones.trim() || undefined,
      });
      onCreated();
      onClose();
      await abrirPdfInformeMedico(creado.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo informe médico" wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          Sale en el formato del talonario, con nombre, cédula, edad y fecha del paciente. Si el texto es largo, la
          letra se ajusta para que quepa en la hoja.
        </p>
        <Textarea
          id="informe-texto"
          label="Informe"
          required
          rows={10}
          value={informe}
          onChange={(e) => setInforme(e.target.value)}
        />
        <Textarea
          id="informe-indicaciones"
          label="Se plantea (opcional)"
          rows={3}
          value={indicaciones}
          onChange={(e) => setIndicaciones(e.target.value)}
          placeholder={"- Continuar con fisioterapia\n- Reevaluación por traumatología"}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Generando..." : "Crear y abrir PDF"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
