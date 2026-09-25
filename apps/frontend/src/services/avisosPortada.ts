import { api } from "./api";

export type TipoAvisoPortada = "DEDICATORIA" | "COMERCIAL";

export interface AvisoPortada {
  id: string;
  tipo: TipoAvisoPortada;
  etiqueta: string | null;
  titulo: string;
  mensaje: string;
  firma: string | null;
  textoBoton: string;
  enlaceUrl: string | null;
  enlaceTexto: string | null;
  updatedAt: string;
}

export interface AvisoPortadaGestion extends AvisoPortada {
  activo: boolean;
  createdAt: string;
}

export interface AvisoPortadaInput {
  etiqueta?: string | null;
  titulo: string;
  mensaje: string;
  firma?: string | null;
  textoBoton?: string;
  enlaceUrl?: string | null;
  enlaceTexto?: string | null;
}

/** Endpoint público: la portada pregunta qué aviso mostrar, o `null` si ninguno. */
export async function obtenerAvisoActivo(): Promise<AvisoPortada | null> {
  const { data } = await api.get<AvisoPortada | null>("/avisos-portada/activo");
  return data;
}

export async function listarAvisos(): Promise<AvisoPortadaGestion[]> {
  const { data } = await api.get<AvisoPortadaGestion[]>("/avisos-portada");
  return data;
}

export async function crearAviso(datos: AvisoPortadaInput): Promise<AvisoPortadaGestion> {
  const { data } = await api.post<AvisoPortadaGestion>("/avisos-portada", datos);
  return data;
}

export async function actualizarAviso(id: string, datos: AvisoPortadaInput): Promise<AvisoPortadaGestion> {
  const { data } = await api.put<AvisoPortadaGestion>(`/avisos-portada/${id}`, datos);
  return data;
}

export async function cambiarAvisoActivo(id: string, activo: boolean): Promise<AvisoPortadaGestion[]> {
  const { data } = await api.put<AvisoPortadaGestion[]>(`/avisos-portada/${id}/activo`, { activo });
  return data;
}

export async function eliminarAviso(id: string): Promise<void> {
  await api.delete(`/avisos-portada/${id}`);
}
