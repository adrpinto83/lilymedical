-- CreateTable
CREATE TABLE "fechas_informe_consulta" (
    "id" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fechas_informe_consulta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fechas_informe_consulta_historiaClinicaId_dia_key" ON "fechas_informe_consulta"("historiaClinicaId", "dia");

-- AddForeignKey
ALTER TABLE "fechas_informe_consulta" ADD CONSTRAINT "fechas_informe_consulta_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

