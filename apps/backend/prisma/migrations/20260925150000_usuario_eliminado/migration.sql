-- AlterTable: baja lógica de usuarios con historial.
ALTER TABLE "usuarios" ADD COLUMN "eliminadoEn" TIMESTAMP(3);
