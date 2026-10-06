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
import informesMedicosRoutes from "./modules/informes-medicos/informes-medicos.routes";
import presupuestosRoutes from "./modules/presupuestos/presupuestos.routes";
import verificacionRoutes from "./modules/verificacion/verificacion.routes";
import recordatoriosRoutes from "./modules/recordatorios/recordatorios.routes";
import portalPacienteRoutes from "./modules/portal-paciente/portal-paciente.routes";
import backupsRoutes from "./modules/backups/backups.routes";
import equiposRoutes from "./modules/equipos/equipos.routes";
import galeriaRoutes from "./modules/galeria/galeria.routes";
import avisosPortadaRoutes from "./modules/avisos-portada/avisos-portada.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // En producción la app vive detrás de cloudflared/nginx en loopback: sin
  // esto req.ip es siempre 127.0.0.1, así que el límite de intentos de login
  // se compartía entre todos los usuarios y la auditoría no guardaba la IP
  // real. Confiar solo en loopback toma la IP que agrega el proxy local.
  app.set("trust proxy", process.env.TRUST_PROXY || "loopback");

  // Las miniaturas de estudios y los PDF a imprimir se muestran desde URLs
  // blob: (se bajan con el token y no por enlace directo): sin permitirlas,
  // el navegador las bloquea y las imágenes no se ven.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "blob:"],
          "frame-src": ["'self'", "blob:"],
        },
      },
    })
  );
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
  // La galería es contenido público de la landing.
  app.use("/uploads/galeria", express.static(path.join(uploadsDir, "galeria")));

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
  app.use("/api/informes-medicos", informesMedicosRoutes);
  app.use("/api/presupuestos", presupuestosRoutes);
  app.use("/api/verificar", verificacionRoutes);
  app.use("/api/recordatorios", recordatoriosRoutes);
  app.use("/api/portal", portalPacienteRoutes);
  app.use("/api/backups", backupsRoutes);
  app.use("/api/equipos", equiposRoutes);
  app.use("/api/galeria", galeriaRoutes);
  app.use("/api/avisos-portada", avisosPortadaRoutes);

  // En producción el mismo proceso puede servir el SPA compilado: así la app
  // viaja por un solo origen (sin CORS) y no hace falta un servidor web
  // delante. En desarrollo la variable no se define y Vite sigue mandando.
  const frontendDir = process.env.FRONTEND_DIR;
  if (frontendDir) {
    app.use(express.static(frontendDir));
    // Rutas del enrutador de React: cualquier GET que no sea API ni archivo
    // subido devuelve el index para que el SPA resuelva la navegación.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
        return next();
      }
      res.sendFile(path.join(frontendDir, "index.html"));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "Recurso no encontrado" });
  });

  app.use(errorHandler);

  return app;
}
