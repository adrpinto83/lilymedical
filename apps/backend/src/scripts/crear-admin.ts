// Crea la cuenta de administrador del sistema con una contraseña temporal
// aleatoria que se imprime una sola vez (no queda en el repositorio ni en la
// base de datos en claro). Se cambia luego desde "Mi cuenta".
//
// Uso (en producción, con el .env cargado):
//   node dist/scripts/crear-admin.js [email] [nombre] [apellido]
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { register } from "../modules/auth/auth.service";

async function main() {
  const [email = "admin@lilymedical.com.ve", nombre = "Administrador", apellido = "LilyMedical"] =
    process.argv.slice(2);

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Ya existe ${email} (rol ${existente.rol}); no se modificó.`);
    return;
  }

  const password = crypto.randomBytes(12).toString("base64url");
  await register({ nombre, apellido, email, password, rol: "ADMIN" });
  console.log(`Cuenta ADMIN creada: ${email}`);
  console.log(`Contraseña temporal: ${password}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
