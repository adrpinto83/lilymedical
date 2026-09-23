import { api } from "./api";

export interface FotoGaleria {
  id: string;
  url: string;
  pie: string;
}

export interface FotoGaleriaGestion extends FotoGaleria {
  archivo: string;
  nombreOriginal: string;
  orden: number;
  visible: boolean;
  createdAt: string;
}

/** Endpoint público: lo consume la landing sin sesión iniciada. */
export async function listarGaleriaPublica(): Promise<FotoGaleria[]> {
  const { data } = await api.get<FotoGaleria[]>("/galeria");
  return data;
}

export async function listarGaleriaGestion(): Promise<FotoGaleriaGestion[]> {
  const { data } = await api.get<FotoGaleriaGestion[]>("/galeria/gestion");
  return data;
}

export async function subirFotoGaleria(archivo: File, pie?: string): Promise<FotoGaleriaGestion> {
  const cuerpo = new FormData();
  cuerpo.append("foto", archivo);
  if (pie?.trim()) cuerpo.append("pie", pie.trim());
  const { data } = await api.post<FotoGaleriaGestion>("/galeria", cuerpo);
  return data;
}

export async function actualizarFotoGaleria(
  id: string,
  datos: { pie?: string; visible?: boolean }
): Promise<FotoGaleriaGestion> {
  const { data } = await api.put<FotoGaleriaGestion>(`/galeria/${id}`, datos);
  return data;
}

export async function reordenarGaleria(ids: string[]): Promise<FotoGaleriaGestion[]> {
  const { data } = await api.put<FotoGaleriaGestion[]>("/galeria/orden", { ids });
  return data;
}

export async function eliminarFotoGaleria(id: string): Promise<void> {
  await api.delete(`/galeria/${id}`);
}
