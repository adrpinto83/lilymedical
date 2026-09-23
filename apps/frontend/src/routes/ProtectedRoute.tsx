import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RolUsuario } from "../types";

// "/" es la landing pública, así que ningún rol aterriza ahí tras iniciar
// sesión. Cada uno va a la primera pantalla que sí puede ver: si un rol
// rebotara a una ruta que también tiene vedada, se produciría un bucle.
export const HOME_POR_ROL: Record<RolUsuario, string> = {
  MEDICO: "/dashboard",
  ADMINISTRATIVO: "/dashboard",
  FISIATRA_AYUDANTE: "/pacientes",
  PACIENTE: "/portal",
};

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: RolUsuario[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to={HOME_POR_ROL[user.rol]} replace />;
  }

  return <Outlet />;
}
