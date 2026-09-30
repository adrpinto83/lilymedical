import { api } from "./api";

// Envía el documento en PDF al correo registrado del paciente. Devuelve el
// email al que se envió para confirmarlo en pantalla.
export type TipoDocumentoCorreo = "recetas" | "constancias" | "planes-ejercicios";

export async function enviarDocumentoPorCorreo(tipo: TipoDocumentoCorreo, id: string): Promise<string> {
  const { data } = await api.post<{ email: string }>(`/${tipo}/${id}/enviar`);
  return data.email;
}

export async function enviarFacturaPorCorreo(id: string): Promise<string> {
  const { data } = await api.post<{ email: string }>(`/facturacion/facturas/${id}/enviar`);
  return data.email;
}
