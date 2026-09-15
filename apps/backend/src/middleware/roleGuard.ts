import { Request, Response, NextFunction } from "express";
import { RolUsuario } from "@prisma/client";
import { HttpError } from "../lib/http-error";

// Restringe el acceso a un endpoint a ciertos roles.
// Uso: router.get("/", requireAuth, roleGuard("MEDICO"), handler)
export function roleGuard(...rolesPermitidos: RolUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new HttpError(401, "No autenticado");
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      throw new HttpError(403, "No tienes permisos para acceder a este recurso");
    }
    next();
  };
}
