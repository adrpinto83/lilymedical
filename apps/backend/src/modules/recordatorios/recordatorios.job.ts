import cron from "node-cron";
import { correoConfigurado } from "../../lib/mailer";
import { enviarRecordatoriosPendientes } from "./recordatorios.service";

// Revisa cada 15 minutos si hay citas próximas sin recordatorio enviado.
// Si no hay SMTP configurado (SMTP_HOST vacío) no se programa nada, para no
// llenar los logs de intentos fallidos en instalaciones que no usan email.
export function iniciarJobRecordatorios() {
  if (!correoConfigurado()) {
    console.log("Recordatorios de citas por email: SMTP no configurado, job no iniciado.");
    return;
  }

  cron.schedule("*/15 * * * *", async () => {
    const resultado = await enviarRecordatoriosPendientes();
    if (resultado.enviados > 0 || resultado.fallidos > 0) {
      console.log(
        `Recordatorios de citas: ${resultado.enviados} enviados, ${resultado.fallidos} fallidos, ${resultado.sinEmail} sin email.`
      );
    }
  });
  console.log("Recordatorios de citas por email: job programado cada 15 minutos.");
}
