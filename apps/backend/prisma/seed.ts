import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Lily2024!", 10);

  // Si ya existía el usuario médico de prueba (nombre genérico de versiones
  // previas del seed), se migra en el lugar en vez de crear una cuenta
  // duplicada.
  const placeholderPrevio = await prisma.usuario.findUnique({
    where: { email: "medico@lilymedical.com" },
  });

  const medico = placeholderPrevio
    ? await prisma.usuario.update({
        where: { id: placeholderPrevio.id },
        data: { nombre: "Lilia", apellido: "Figuera", email: "liliafiguera@gmail.com", especialidad: "Fisiatría" },
      })
    : await prisma.usuario.upsert({
        where: { email: "liliafiguera@gmail.com" },
        update: {},
        create: {
          nombre: "Lilia",
          apellido: "Figuera",
          email: "liliafiguera@gmail.com",
          passwordHash,
          rol: "MEDICO",
          especialidad: "Fisiatría",
        },
      });

  // Membrete real del consultorio, tomado del recetario físico vigente
  const membreteReal = {
    colegiatura: "73766",
    cma: "6576",
    rif: "V-16140360-8",
    instagram: "@dra.fisya",
    tituloProfesional: "Médico Fisiatra",
    direccionConsultorio: "Av. Stadium, C.C. Novocentro, Pb local 08, Puerto la Cruz.",
    telefonoConsultorio: "0414-7964640",
  };
  await prisma.perfilMedico.upsert({
    where: { usuarioId: medico.id },
    update: membreteReal,
    create: { usuarioId: medico.id, ...membreteReal },
  });

  await prisma.usuario.upsert({
    where: { email: "admin@lilymedical.com" },
    update: {},
    create: {
      nombre: "Carla",
      apellido: "Ruiz",
      email: "admin@lilymedical.com",
      passwordHash,
      rol: "ADMINISTRATIVO",
    },
  });

  const tarifasBase = [
    { nombreServicio: "Consulta de Fisiatría", precio: 50 },
    { nombreServicio: "Terapia Física", precio: 30 },
    { nombreServicio: "Terapia Ocupacional", precio: 30 },
    { nombreServicio: "Electroterapia", precio: 20 },
  ];

  for (const tarifa of tarifasBase) {
    const existente = await prisma.tarifa.findFirst({
      where: { nombreServicio: tarifa.nombreServicio },
    });
    if (!existente) {
      await prisma.tarifa.create({ data: tarifa });
    }
  }

  console.log("Seed completado.");
  console.log(`Usuario médico: liliafiguera@gmail.com / Lily2024! (cambiar en producción)`);
  console.log(`Usuario administrativo: admin@lilymedical.com / Lily2024!`);
  console.log(`Médico creado con id: ${medico.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
