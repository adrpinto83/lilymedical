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

async function descargarPdf(ruta: string, params: Record<string, string>): Promise<string> {
  const { data } = await api.get(ruta, { responseType: "blob", params });
  return URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
}

function paramsHistoria(opciones?: OpcionesExportarHistoria): Record<string, string> {
  const params: Record<string, string> = {};
  if (opciones?.desde) params.desde = opciones.desde;
  if (opciones?.hasta) params.hasta = opciones.hasta;
  if (opciones?.incluirImagenes) params.incluirImagenes = "true";
  return params;
}

// Abre el PDF ya generado; si el bloqueador de emergentes lo impide, lo descarga.
function mostrarPdf(url: string, nombreArchivo: string) {
  if (window.open(url, "_blank")) return;
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
}

// La pestaña se abre antes de esperar al servidor: si se abre después, los
// bloqueadores de ventanas emergentes (sobre todo en Safari/iPhone) la frenan.
async function abrirPdf(obtenerUrl: () => Promise<string>, nombreArchivo: string): Promise<void> {
  const ventana = window.open("", "_blank");
  try {
    const url = await obtenerUrl();
    if (ventana) ventana.location.href = url;
    // Ventanas emergentes bloqueadas: se descarga en vez de salir de la app.
    else mostrarPdf(url, nombreArchivo);
  } catch (err) {
    ventana?.close();
    throw err;
  }
}

/**
 * Abre directamente el diálogo de impresión con el PDF. En teléfonos y
 * tabletas (donde imprimir un PDF incrustado no funciona) y en Firefox (su
 * visor de PDF no deja que la página lo mande a imprimir, y la ventana de
 * respaldo la frena el bloqueador de emergentes) abre el PDF en una pestaña
 * para imprimirlo desde el visor.
 */
async function imprimirPdf(obtenerUrl: () => Promise<string>, nombreArchivo: string): Promise<void> {
  if (window.matchMedia?.("(pointer: coarse)").matches || /firefox/i.test(navigator.userAgent)) {
    return abrirPdf(obtenerUrl, nombreArchivo);
  }
  const url = await obtenerUrl();
  const marco = document.createElement("iframe");
  marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  marco.src = url;
  document.body.appendChild(marco);
  await new Promise<void>((resolve) => {
    // Si el marco no termina de cargar, se muestra el PDF en vez de quedarse esperando.
    const tope = setTimeout(() => {
      mostrarPdf(url, nombreArchivo);
      resolve();
    }, 15_000);
    marco.onload = () => {
      clearTimeout(tope);
      try {
        marco.contentWindow!.focus();
        marco.contentWindow!.print();
      } catch {
        // Si el navegador no deja imprimir el marco, se muestra el PDF.
        mostrarPdf(url, nombreArchivo);
      }
      resolve();
    };
  });
  // El diálogo de impresión necesita el marco vivo mientras está abierto.
  setTimeout(() => marco.remove(), 60_000);
}

export function abrirPdfHistoriaClinica(pacienteId: string, opciones?: OpcionesExportarHistoria): Promise<void> {
  return abrirPdf(
    () => descargarPdf(`/historias-clinicas/paciente/${pacienteId}/pdf`, paramsHistoria(opciones)),
    "historia-clinica.pdf"
  );
}

export function imprimirPdfHistoriaClinica(pacienteId: string, opciones?: OpcionesExportarHistoria): Promise<void> {
  return imprimirPdf(
    () => descargarPdf(`/historias-clinicas/paciente/${pacienteId}/pdf`, paramsHistoria(opciones)),
    "historia-clinica.pdf"
  );
}

export type ReferenciaConsulta = { sesionId: string } | { evaluacionId: string };

/** Informe de una sola consulta (lo registrado ese día), para el paciente. */
export function imprimirInformeConsulta(pacienteId: string, referencia: ReferenciaConsulta): Promise<void> {
  return imprimirPdf(
    () => descargarPdf(`/historias-clinicas/paciente/${pacienteId}/consulta/pdf`, { ...referencia }),
    "informe-consulta.pdf"
  );
}
