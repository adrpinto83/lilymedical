-- AlterTable
ALTER TABLE "historias_clinicas" ADD COLUMN     "alergias" TEXT;

-- AlterTable
ALTER TABLE "recetas" ADD COLUMN     "fechaVencimiento" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "plantillas_receta" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoReceta" NOT NULL,
    "medicamento" TEXT,
    "presentacion" TEXT,
    "dosis" TEXT,
    "frecuencia" TEXT,
    "duracion" TEXT,
    "tipoTerapia" TEXT,
    "sesiones" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantillas_receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_ejercicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "descripcion" TEXT,
    "repeticionesSugeridas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantillas_ejercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_ejercicios" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planes_ejercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_plan_ejercicios" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "repeticionesSugeridas" TEXT,

    CONSTRAINT "items_plan_ejercicios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planes_ejercicios_pacienteId_idx" ON "planes_ejercicios"("pacienteId");

-- AddForeignKey
ALTER TABLE "plantillas_receta" ADD CONSTRAINT "plantillas_receta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_ejercicios" ADD CONSTRAINT "planes_ejercicios_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_ejercicios" ADD CONSTRAINT "planes_ejercicios_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_ejercicios" ADD CONSTRAINT "planes_ejercicios_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_plan_ejercicios" ADD CONSTRAINT "items_plan_ejercicios_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_ejercicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
