import { FormEvent, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { abrirPdfHistoriaClinica, imprimirPdfHistoriaClinica } from "../../services/historiasClinicas";
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
  const [generando, setGenerando] = useState<"imprimir" | "ver" | null>(null);

  async function generar(modo: "imprimir" | "ver") {
    setGenerando(modo);
    setError(null);
    const opciones = { desde: desde || undefined, hasta: hasta || undefined, incluirImagenes };
    try {
      if (modo === "imprimir") await imprimirPdfHistoriaClinica(pacienteId, opciones);
      else await abrirPdfHistoriaClinica(pacienteId, opciones);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerando(null);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    generar("imprimir");
  }

  return (
    <Modal open={open} onClose={onClose} title="Imprimir o exportar historia clínica">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          Deja las fechas vacías para incluir todo el historial. El PDF incluye datos clínicos,
          evaluaciones fisiátricas, gráfico de evolución (EVA/Barthel/ROM) y notas de sesión.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input id="exportar-desde" type="date" label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input id="exportar-hasta" type="date" label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} />
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
          <Button type="button" variant="secondary" disabled={generando !== null} onClick={() => generar("ver")}>
            {generando === "ver" ? "Generando..." : "Ver / descargar PDF"}
          </Button>
          <Button type="submit" disabled={generando !== null}>
            {generando === "imprimir" ? "Preparando..." : "🖨 Imprimir"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
