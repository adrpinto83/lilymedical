import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import authRoutes from "./modules/auth/auth.routes";
import pacientesRoutes from "./modules/pacientes/pacientes.routes";
import historiasClinicasRoutes from "./modules/historias-clinicas/historias-clinicas.routes";
import sesionesRoutes from "./modules/sesiones/sesiones.routes";
import citasRoutes from "./modules/citas/citas.routes";
import facturacionRoutes from "./modules/facturacion/facturacion.routes";
import aseguradorasRoutes from "./modules/aseguradoras/aseguradoras.routes";
import autorizacionesRoutes from "./modules/autorizaciones/autorizaciones.routes";
import inventarioRoutes from "./modules/inventario/inventario.routes";
import reportesRoutes from "./modules/reportes/reportes.routes";
import adjuntosRoutes from "./modules/adjuntos/adjuntos.routes";
import usuariosRoutes from "./modules/usuarios/usuarios.routes";
import perfilMedicoRoutes from "./modules/perfil-medico/perfil-medico.routes";
import recetasRoutes from "./modules/recetas/recetas.routes";
import plantillasRecetaRoutes from "./modules/plantillas-receta/plantillas-receta.routes";
import plantillasEjercicioRoutes from "./modules/plantillas-ejercicio/plantillas-ejercicio.routes";
import planesEjerciciosRoutes from "./modules/planes-ejercicios/planes-ejercicios.routes";
import constanciasRoutes from "./modules/constancias/constancias.routes";
import verificacionRoutes from "./modules/verificacion/verificacion.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", sistema: "LilyMedical API" });
  });

  // La firma del médico no es dato clínico de un paciente, así que se sirve
  // estática. El resto de los adjuntos siguen protegidos vía /api/adjuntos.
  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR || "uploads");
  app.use("/uploads/firmas", express.static(path.join(uploadsDir, "firmas")));

  app.use("/api/auth", authRoutes);
  app.use("/api/pacientes", pacientesRoutes);
  app.use("/api/historias-clinicas", historiasClinicasRoutes);
  app.use("/api/sesiones", sesionesRoutes);
  app.use("/api/citas", citasRoutes);
  app.use("/api/facturacion", facturacionRoutes);
  app.use("/api/aseguradoras", aseguradorasRoutes);
  app.use("/api/autorizaciones", autorizacionesRoutes);
  app.use("/api/inventario", inventarioRoutes);
  app.use("/api/reportes", reportesRoutes);
  app.use("/api/adjuntos", adjuntosRoutes);
  app.use("/api/usuarios", usuariosRoutes);
  app.use("/api/perfil-medico", perfilMedicoRoutes);
  app.use("/api/recetas", recetasRoutes);
  app.use("/api/plantillas-receta", plantillasRecetaRoutes);
  app.use("/api/plantillas-ejercicio", plantillasEjercicioRoutes);
  app.use("/api/planes-ejercicios", planesEjerciciosRoutes);
  app.use("/api/constancias", constanciasRoutes);
  app.use("/api/verificar", verificacionRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Recurso no encontrado" });
  });

  app.use(errorHandler);

  return app;
}
