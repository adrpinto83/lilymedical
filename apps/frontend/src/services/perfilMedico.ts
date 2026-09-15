import { api } from "./api";
import { PerfilMedico } from "../types";

export async function obtenerPerfilMedico(): Promise<PerfilMedico> {
  const { data } = await api.get<PerfilMedico>("/perfil-medico/me");
  return data;
}

export async function actualizarPerfilMedico(payload: {
  colegiatura?: string;
  cma?: string;
  rif?: string;
  instagram?: string;
  tituloProfesional?: string;
  nombreConsultorio?: string;
  direccionConsultorio?: string;
  telefonoConsultorio?: string;
}): Promise<PerfilMedico> {
  const { data } = await api.put<PerfilMedico>("/perfil-medico/me", payload);
  return data;
}

export async function subirFirma(archivo: File): Promise<PerfilMedico> {
  const formData = new FormData();
  formData.append("firma", archivo);
  const { data } = await api.post<PerfilMedico>("/perfil-medico/me/firma", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
