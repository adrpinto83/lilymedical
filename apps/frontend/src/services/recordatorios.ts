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
