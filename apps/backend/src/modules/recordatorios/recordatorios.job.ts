import cron from "node-cron";
import { correoConfigurado } from "../../lib/mailer";
import { enviarRecordatoriosPendientes } from "./recordatorios.service";
import { enviarFelicitacionesCumpleanos } from "../correos/correos.service";
import { ZONA_HORARIA } from "../correos/correos.layout";

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

// Felicitaciones de cumpleaños. Por defecto revisa cada hora de 8 a. m. a
// 8 p. m. (hora del consultorio): la primera pasada envía y las siguientes
// solo recuperan lo que un reinicio del servidor pudo haber saltado, porque
// cada paciente se felicita una sola vez por año. CUMPLEANOS_CRON="off" lo apaga.
export function iniciarJobCumpleanos() {
  const expresion = process.env.CUMPLEANOS_CRON || "0 8-20 * * *";
  if (!correoConfigurado() || expresion === "off") {
    console.log("Felicitaciones de cumpleaños por email: desactivadas.");
    return;
  }
  if (!cron.validate(expresion)) {
    console.error(`Felicitaciones de cumpleaños: CUMPLEANOS_CRON inválido ("${expresion}"), job no iniciado.`);
    return;
  }

  cron.schedule(
    expresion,
    async () => {
      try {
        const r = await enviarFelicitacionesCumpleanos();
        if (r.enviados > 0 || r.fallidos > 0) {
          console.log(`Felicitaciones de cumpleaños: ${r.enviados} enviadas, ${r.fallidos} fallidas, ${r.sinEmail} sin email.`);
        }
      } catch (err) {
        console.error("Felicitaciones de cumpleaños fallaron:", err);
      }
    },
    { timezone: ZONA_HORARIA }
  );
  console.log(`Felicitaciones de cumpleaños por email: job programado ("${expresion}", ${ZONA_HORARIA}).`);
}
