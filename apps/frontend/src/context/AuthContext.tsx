import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { api, getErrorMessage } from "../services/api";
import { RolUsuario } from "../types";

interface AuthUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registrarPaciente: (documento: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("lilymedical_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("lilymedical_token", data.token);
      localStorage.setItem("lilymedical_user", JSON.stringify(data.usuario));
      setUser(data.usuario);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const registrarPaciente = useCallback(async (documento: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/registro-paciente", { documento, email, password });
      localStorage.setItem("lilymedical_token", data.token);
      localStorage.setItem("lilymedical_user", JSON.stringify(data.usuario));
      setUser(data.usuario);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("lilymedical_token");
    localStorage.removeItem("lilymedical_user");
    setUser(null);
  }, []);

  // El nombre/rol quedan "congelados" en localStorage desde el login. Se
  // refrescan una vez al cargar la app por si cambiaron en el servidor
  // (ej. un admin corrigió el nombre) sin forzar un re-login.
  useEffect(() => {
    if (!localStorage.getItem("lilymedical_token")) return;
    api
      .get("/auth/me")
      .then(({ data }) => {
        localStorage.setItem("lilymedical_user", JSON.stringify(data.usuario));
        setUser(data.usuario);
      })
      .catch(() => {
        // token inválido/expirado: el interceptor de api.ts ya redirige a /login
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, registrarPaciente, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
