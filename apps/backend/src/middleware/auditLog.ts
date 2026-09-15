import { Request, Response, NextFunction } from "express";
import { AccionLog } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Registra accesos a historias clínicas (lectura o escritura) para
// cumplimiento de privacidad. No bloquea la respuesta si el log falla.
export function auditLog(accion: AccionLog) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (!req.user || res.statusCode >= 400) return;
      const pacienteId = req.params.pacienteId ?? req.body?.pacienteId ?? undefined;
      const historiaClinicaId =
        req.params.historiaClinicaId ?? req.params.id ?? undefined;

      prisma.logAcceso
        .create({
          data: {
            usuarioId: req.user.sub,
            pacienteId,
            historiaClinicaId: historiaClinicaId,
            accion,
            detalle: `${req.method} ${req.originalUrl}`,
            ip: req.ip,
          },
        })
        .catch((err) => console.error("Error registrando log de acceso:", err));
    });
    next();
  };
}
