-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "pacienteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_pacienteId_key" ON "usuarios"("pacienteId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

