import cron from "node-cron";
import { crearBackup } from "./backups.service";

// Backup diario de la base de datos (Fase 13). La expresión cron es
// configurable vía BACKUP_CRON; por defecto corre todos los días a las 3am.
export function iniciarJobBackups() {
  const expresion = process.env.BACKUP_CRON || "0 3 * * *";
  if (!cron.validate(expresion)) {
    console.error(`Backups de base de datos: BACKUP_CRON inválido ("${expresion}"), job no iniciado.`);
    return;
  }

  cron.schedule(expresion, async () => {
    try {
      const backup = await crearBackup();
      console.log(`Backup de base de datos creado: ${backup.archivo} (${backup.tamanioBytes} bytes)`);
    } catch (err) {
      console.error("Backup de base de datos falló:", err);
    }
  });
  console.log(`Backups de base de datos: job programado ("${expresion}").`);
}
