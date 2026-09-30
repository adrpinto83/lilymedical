-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "instagram" TEXT;

-- AlterTable
ALTER TABLE "historias_clinicas" ADD COLUMN     "fechaConsulta" DATE,
ADD COLUMN     "enfermedadActual" TEXT,
ADD COLUMN     "estudiosComplementarios" TEXT;
