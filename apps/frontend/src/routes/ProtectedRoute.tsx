import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RolUsuario } from "../types";

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: RolUsuario[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // Cada rol tiene su propio "home": el personal usa "/" (Dashboard) y el
    // paciente "/portal", para no rebotar a una ruta que también le está
    // vedada (lo que produciría un loop de redirects).
    return <Navigate to={user.rol === "PACIENTE" ? "/portal" : "/"} replace />;
  }

  return <Outlet />;
}
