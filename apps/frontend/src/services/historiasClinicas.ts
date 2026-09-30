import { api } from "./api";
import { HistoriaClinica, EvaluacionFisiatrica } from "../types";

export async function obtenerHistoriaPorPaciente(pacienteId: string): Promise<HistoriaClinica> {
  const { data } = await api.get<HistoriaClinica>(`/historias-clinicas/paciente/${pacienteId}`);
  return data;
}

export async function actualizarHistoria(
  pacienteId: string,
  payload: Partial<HistoriaClinica>
): Promise<HistoriaClinica> {
  const { data } = await api.put<HistoriaClinica>(
    `/historias-clinicas/paciente/${pacienteId}`,
    payload
  );
  return data;
}

export async function agregarEvaluacion(
  pacienteId: string,
  payload: {
    tipoEscala: string;
    nombreEscala?: string;
    datos: Record<string, unknown>;
    puntajeTotal?: number;
    observaciones?: string;
  }
): Promise<EvaluacionFisiatrica> {
  const { data } = await api.post<EvaluacionFisiatrica>(
    `/historias-clinicas/paciente/${pacienteId}/evaluaciones`,
    payload
  );
  return data;
}

export async function obtenerLineaDeTiempo(pacienteId: string) {
  const { data } = await api.get(`/historias-clinicas/paciente/${pacienteId}/linea-tiempo`);
  return data;
}

export interface OpcionesExportarHistoria {
  desde?: string;
  hasta?: string;
  incluirImagenes?: boolean;
}

async function descargarPdfHistoria(pacienteId: string, opciones?: OpcionesExportarHistoria): Promise<string> {
  const params: Record<string, string> = {};
  if (opciones?.desde) params.desde = opciones.desde;
  if (opciones?.hasta) params.hasta = opciones.hasta;
  if (opciones?.incluirImagenes) params.incluirImagenes = "true";

  const { data } = await api.get(`/historias-clinicas/paciente/${pacienteId}/pdf`, {
    responseType: "blob",
    params,
  });
  return URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
}

// La pestaña se abre antes de esperar al servidor: si se abre después, los
// bloqueadores de ventanas emergentes (sobre todo en Safari/iPhone) la frenan.
export async function abrirPdfHistoriaClinica(
  pacienteId: string,
  opciones?: OpcionesExportarHistoria
): Promise<void> {
  const ventana = window.open("", "_blank");
  try {
    const url = await descargarPdfHistoria(pacienteId, opciones);
    if (ventana) {
      ventana.location.href = url;
    } else {
      // Ventanas emergentes bloqueadas: se descarga en vez de salir de la app.
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "historia-clinica.pdf";
      enlace.click();
    }
  } catch (err) {
    ventana?.close();
    throw err;
  }
}

/**
 * Abre directamente el diálogo de impresión con el PDF de la historia. En
 * teléfonos y tabletas (donde imprimir un PDF incrustado no funciona) abre
 * el PDF para imprimirlo desde el visor.
 */
export async function imprimirPdfHistoriaClinica(
  pacienteId: string,
  opciones?: OpcionesExportarHistoria
): Promise<void> {
  if (window.matchMedia?.("(pointer: coarse)").matches) {
    return abrirPdfHistoriaClinica(pacienteId, opciones);
  }
  const url = await descargarPdfHistoria(pacienteId, opciones);
  const marco = document.createElement("iframe");
  marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  marco.src = url;
  document.body.appendChild(marco);
  await new Promise<void>((resolve) => {
    const tope = setTimeout(resolve, 15_000);
    marco.onload = () => {
      clearTimeout(tope);
      try {
        marco.contentWindow!.focus();
        marco.contentWindow!.print();
      } catch {
        // Si el navegador no deja imprimir el marco, se muestra el PDF.
        window.open(url, "_blank");
      }
      resolve();
    };
  });
  // El diálogo de impresión necesita el marco vivo mientras está abierto.
  setTimeout(() => marco.remove(), 60_000);
}
