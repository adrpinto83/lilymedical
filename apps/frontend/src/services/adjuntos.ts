import { api } from "./api";
import { Adjunto } from "../types";

export async function subirAdjunto(
  pacienteId: string,
  archivo: File,
  opciones?: { categoria?: string; descripcion?: string }
): Promise<Adjunto> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  if (opciones?.categoria) formData.append("categoria", opciones.categoria);
  if (opciones?.descripcion) formData.append("descripcion", opciones.descripcion);

  const { data } = await api.post<Adjunto>(`/adjuntos/paciente/${pacienteId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function obtenerArchivoAdjunto(id: string): Promise<Blob> {
  const { data } = await api.get(`/adjuntos/${id}/descargar`, { responseType: "blob" });
  return data;
}

export async function eliminarAdjunto(id: string): Promise<void> {
  await api.delete(`/adjuntos/${id}`);
}
