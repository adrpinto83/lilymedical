import rateLimit from "express-rate-limit";

// Primera capa de defensa contra fuerza bruta: limita intentos por IP antes
// de llegar al bloqueo por cuenta (ver auth.service.login). Cubre además el
// caso de un atacante probando muchos emails distintos desde la misma IP.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos antes de volver a intentar." },
});
