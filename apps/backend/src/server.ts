import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { iniciarJobCumpleanos, iniciarJobRecordatorios } from "./modules/recordatorios/recordatorios.job";
import { iniciarJobBackups } from "./modules/backups/backups.job";

const port = Number(process.env.PORT) || 4000;
// Detrás de un proxy o un túnel conviene escuchar solo en loopback, para que
// el puerto no quede accesible desde internet saltándose el TLS.
const host = process.env.HOST || "0.0.0.0";
const app = createApp();

app.listen(port, host, () => {
  console.log(`LilyMedical API escuchando en http://${host}:${port}`);
  iniciarJobRecordatorios();
  iniciarJobCumpleanos();
  iniciarJobBackups();
});
