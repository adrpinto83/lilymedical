import { FotoCarrusel } from "./Carrusel";
import { piesDeFoto } from "./contenido";

/**
 * Fotos del carrusel, descubiertas en tiempo de compilación.
 *
 * Basta con dejar los archivos en `src/assets/galeria/` (ver el LEEME de esa
 * carpeta): Vite los resuelve con hash y los optimiza, y no hace falta
 * mantener ninguna lista a mano. Instagram no entrega las imágenes de las
 * publicaciones sin sesión iniciada, así que hay que descargarlas desde la
 * propia cuenta y copiarlas ahí.
 */
const modulos = import.meta.glob<string>("../../assets/galeria/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});

/** "01-terapia-de-hombro.jpg" -> "Terapia de hombro" */
export function descripcionDesdeNombre(ruta: string): string {
  const archivo = ruta.split("/").pop() ?? ruta;
  const texto = archivo
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[._-]+/g, " ")
    .trim();
  if (!texto) return "Fotografía del consultorio";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const fotosGaleria: FotoCarrusel[] = Object.keys(modulos)
  .sort((a, b) => a.localeCompare(b, "es"))
  .map((ruta) => {
    const base = (ruta.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
    return { url: modulos[ruta], alt: piesDeFoto[base] ?? descripcionDesdeNombre(ruta) };
  });
