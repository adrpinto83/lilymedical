import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { iniciarJobRecordatorios } from "./modules/recordatorios/recordatorios.job";
import { iniciarJobBackups } from "./modules/backups/backups.job";

const port = Number(process.env.PORT) || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`LilyMedical API escuchando en http://localhost:${port}`);
  iniciarJobRecordatorios();
  iniciarJobBackups();
});
