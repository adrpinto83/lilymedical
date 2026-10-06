const LADO = 512;

/**
 * Recorta la imagen al centro en un cuadrado de 512 px y la comprime a JPEG:
 * una foto de teléfono de varios MB queda en unos 50 KB. El navegador ya
 * aplica la orientación EXIF al decodificarla.
 */
export async function recortarFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const lado = Math.min(imagen.width, imagen.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(LADO, lado);
  canvas.height = canvas.width;
  canvas
    .getContext("2d")!
    .drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, canvas.width, canvas.height);
  imagen.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto"))), "image/jpeg", 0.85)
  );
}
