import { api } from "./api";

export async function solicitarRestablecimiento(email: string): Promise<void> {
  await api.post("/auth/olvide-password", { email });
}

export async function restablecerPassword(token: string, nueva: string): Promise<void> {
  await api.post("/auth/restablecer-password", { token, nueva });
}
