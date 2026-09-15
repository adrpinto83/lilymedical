// Levanta un PostgreSQL local (binario embebido, sin Docker/root) para
// desarrollo en este entorno. Uso: node scripts/local-postgres.mjs
import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, "..", ".pgdata");

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "lilymedical",
  password: "lilymedical",
  port: 5432,
  persistent: true,
  onLog: (msg) => process.stdout.write(msg),
});

const fs = await import("fs");
const alreadyInitialised = fs.existsSync(path.join(databaseDir, "PG_VERSION"));

if (!alreadyInitialised) {
  console.log("Inicializando cluster de PostgreSQL en", databaseDir);
  await pg.initialise();
}

console.log("Iniciando PostgreSQL en el puerto 5432...");
await pg.start();

if (!alreadyInitialised) {
  try {
    await pg.createDatabase("lilymedical");
    console.log("Base de datos 'lilymedical' creada.");
  } catch (err) {
    console.log("La base de datos ya existe o no se pudo crear:", err.message);
  }
}

console.log("PostgreSQL listo. Dejando el proceso corriendo (no cerrar esta terminal).");

process.on("SIGTERM", async () => {
  await pg.stop();
  process.exit(0);
});

// Mantiene el proceso vivo indefinidamente
await new Promise(() => {});
