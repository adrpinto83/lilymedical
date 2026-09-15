import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RolUsuario } from "../types";

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: RolUsuario[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
