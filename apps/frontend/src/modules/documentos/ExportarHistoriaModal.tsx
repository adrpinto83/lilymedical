import { FormEvent, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { abrirPdfHistoriaClinica } from "../../services/historiasClinicas";
import { getErrorMessage } from "../../services/api";

export function ExportarHistoriaModal({
  open,
  onClose,
  pacienteId,
}: {
  open: boolean;
  onClose: () => void;
  pacienteId: string;
}) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [incluirImagenes, setIncluirImagenes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGenerando(true);
    setError(null);
    try {
      await abrirPdfHistoriaClinica(pacienteId, {
        desde: desde || undefined,
        hasta: hasta || undefined,
        incluirImagenes,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Exportar historia clínica completa">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          Deja las fechas vacías para incluir todo el historial. El PDF incluye datos clínicos,
          evaluaciones fisiátricas, gráfico de evolución (EVA/Barthel/ROM) y notas de sesión.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input type="date" label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input type="date" label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={incluirImagenes}
            onChange={(e) => setIncluirImagenes(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-lily-blue-600 focus:ring-lily-blue-500"
          />
          Anexar imágenes y estudios cargados al final del documento
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={generando}>
            {generando ? "Generando..." : "Generar PDF"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
