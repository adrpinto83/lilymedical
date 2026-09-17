import nodemailer, { Transporter } from "nodemailer";

let transportador: Transporter | null | undefined;

// `undefined` = todavía no se intentó crear; `null` = SMTP no configurado
// (se cachea para no releer env vars en cada envío). Si no hay SMTP_HOST,
// los recordatorios simplemente no se envían (ver README, Fase 11).
function obtenerTransportador(): Transporter | null {
  if (transportador !== undefined) return transportador;

  if (!process.env.SMTP_HOST) {
    transportador = null;
    return transportador;
  }

  transportador = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transportador;
}

export function correoConfigurado(): boolean {
  return obtenerTransportador() !== null;
}

export async function enviarEmail(opciones: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const transporte = obtenerTransportador();
  if (!transporte) return false;

  try {
    await transporte.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      ...opciones,
    });
    return true;
  } catch (err) {
    console.error("Error enviando email:", err);
    return false;
  }
}
