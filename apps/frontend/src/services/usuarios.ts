import { api } from "./api";
import { RolUsuario } from "../types";

export interface Profesional {
  id: string;
  nombre: string;
  apellido: string;
  especialidad?: string | null;
  rol?: RolUsuario;
}

export async function listarProfesionales(): Promise<Profesional[]> {
  const { data } = await api.get<Profesional[]>("/usuarios/profesionales");
  return data;
}

export interface UsuarioPersonal {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  especialidad?: string | null;
  activo: boolean;
  createdAt: string;
}

/** Cambio de la contraseña propia: exige la actual. Lo usa cualquier rol. */
export async function cambiarMiPassword(actual: string, nueva: string): Promise<void> {
  await api.put("/auth/password", { actual, nueva });
}

export async function listarPersonal(): Promise<UsuarioPersonal[]> {
  const { data } = await api.get<UsuarioPersonal[]>("/usuarios");
  return data;
}

export async function crearUsuario(datos: {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: Exclude<RolUsuario, "PACIENTE">;
  especialidad?: string;
}): Promise<UsuarioPersonal> {
  const { data } = await api.post<UsuarioPersonal>("/usuarios", datos);
  return data;
}

export async function actualizarUsuario(
  id: string,
  datos: { nombre?: string; apellido?: string; especialidad?: string | null; activo?: boolean }
): Promise<UsuarioPersonal> {
  const { data } = await api.put<UsuarioPersonal>(`/usuarios/${id}`, datos);
  return data;
}

/** Reinicio de la contraseña de otra persona (la olvidó): no pide la actual. */
export async function reiniciarPassword(id: string, nueva: string): Promise<void> {
  await api.post(`/usuarios/${id}/password`, { nueva });
}

/**
 * Elimina a un miembro del personal (salvo el administrador del sistema).
 * "archivado": tenía historial, así que se dio de baja sin borrar sus registros.
 */
export async function eliminarUsuario(id: string): Promise<"eliminado" | "archivado"> {
  const { data } = await api.delete<{ resultado: "eliminado" | "archivado" }>(`/usuarios/${id}`);
  return data.resultado;
}
