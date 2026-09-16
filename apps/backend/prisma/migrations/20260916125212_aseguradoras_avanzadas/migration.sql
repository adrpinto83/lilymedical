-- CreateEnum
CREATE TYPE "EstadoAutorizacion" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- AlterTable: nuevas reglas de cobertura en aseguradoras
ALTER TABLE "aseguradoras" ADD COLUMN     "porcentajeCobertura" DOUBLE PRECISION,
ADD COLUMN     "requiereAutorizacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "topeMontoPorSesion" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "autorizaciones_seguro" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "aseguradoraId" TEXT NOT NULL,
    "numeroAutorizacion" TEXT,
    "sesionesAutorizadas" INTEGER,
    "estado" "EstadoAutorizacion" NOT NULL DEFAULT 'PENDIENTE',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autorizaciones_seguro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente_aseguradoras" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "aseguradoraId" TEXT NOT NULL,
    "numeroAfiliacion" TEXT,
    "esPrimaria" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paciente_aseguradoras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "autorizaciones_seguro_pacienteId_idx" ON "autorizaciones_seguro"("pacienteId");

-- CreateIndex
CREATE INDEX "paciente_aseguradoras_pacienteId_idx" ON "paciente_aseguradoras"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_aseguradoras_pacienteId_aseguradoraId_key" ON "paciente_aseguradoras"("pacienteId", "aseguradoraId");

-- AddForeignKey
ALTER TABLE "autorizaciones_seguro" ADD CONSTRAINT "autorizaciones_seguro_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autorizaciones_seguro" ADD CONSTRAINT "autorizaciones_seguro_aseguradoraId_fkey" FOREIGN KEY ("aseguradoraId") REFERENCES "aseguradoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_aseguradoras" ADD CONSTRAINT "paciente_aseguradoras_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente_aseguradoras" ADD CONSTRAINT "paciente_aseguradoras_aseguradoraId_fkey" FOREIGN KEY ("aseguradoraId") REFERENCES "aseguradoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: traslada el seguro único actual de cada paciente como su
-- registro primario en la nueva tabla, antes de borrar las columnas viejas.
INSERT INTO "paciente_aseguradoras" ("id", "pacienteId", "aseguradoraId", "numeroAfiliacion", "esPrimaria", "activo", "createdAt")
SELECT gen_random_uuid()::text, "id", "aseguradoraId", "numeroAfiliacion", true, true, CURRENT_TIMESTAMP
FROM "pacientes"
WHERE "aseguradoraId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "pacientes" DROP CONSTRAINT "pacientes_aseguradoraId_fkey";

-- AlterTable
ALTER TABLE "pacientes" DROP COLUMN "aseguradoraId",
DROP COLUMN "numeroAfiliacion";
