import { api } from "./api";

export interface ResultadoRecordatorios {
  configurado: boolean;
  revisadas: number;
  enviados: number;
  fallidos: number;
  sinEmail: number;
}

export async function enviarRecordatoriosAhora(): Promise<ResultadoRecordatorios> {
  const { data } = await api.post<ResultadoRecordatorios>("/recordatorios/enviar");
  return data;
}

export interface Cumpleanero {
  id: string;
  nombre: string;
  email: string | null;
  felicitado: boolean;
}

export interface ResultadoCumpleanos {
  configurado: boolean;
  cumpleaneros: Cumpleanero[];
  enviados: number;
  fallidos: number;
  sinEmail: number;
}

export async function listarCumpleanerosDeHoy(): Promise<Cumpleanero[]> {
  const { data } = await api.get<Cumpleanero[]>("/recordatorios/cumpleanos");
  return data;
}

export async function enviarFelicitacionesAhora(): Promise<ResultadoCumpleanos> {
  const { data } = await api.post<ResultadoCumpleanos>("/recordatorios/cumpleanos/enviar");
  return data;
}
