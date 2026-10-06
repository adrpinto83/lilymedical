import { api } from "./api";

// Los PDF exigen el token, así que se bajan con axios y se muestran como blob.

export async function descargarPdf(ruta: string, params: Record<string, string> = {}): Promise<string> {
  const { data } = await api.get(ruta, { responseType: "blob", params });
  return URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
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
export async function abrirPdf(obtenerUrl: () => Promise<string>, nombreArchivo: string): Promise<void> {
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
export async function imprimirPdf(obtenerUrl: () => Promise<string>, nombreArchivo: string): Promise<void> {
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

/** Baja el PDF de `ruta` y lo abre en una pestaña nueva (o lo descarga). */
export function verPdf(ruta: string, nombreArchivo = "documento.pdf"): Promise<void> {
  return abrirPdf(() => descargarPdf(ruta), nombreArchivo);
}
