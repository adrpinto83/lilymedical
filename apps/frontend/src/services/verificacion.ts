import { api } from "./api";

export interface ResultadoVerificacion {
  valido: boolean;
  tipo?: string;
  numeroDocumento?: string;
  fecha?: string;
  medico?: string;
}

export async function verificarDocumento(codigo: string): Promise<ResultadoVerificacion> {
  try {
    const { data } = await api.get<ResultadoVerificacion>(`/verificar/${codigo}`);
    return data;
  } catch {
    return { valido: false };
  }
}
