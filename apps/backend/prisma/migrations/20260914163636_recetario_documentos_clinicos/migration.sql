-- CreateEnum
CREATE TYPE "TipoReceta" AS ENUM ('MEDICAMENTO', 'ORDEN_TERAPIA');

-- CreateTable
CREATE TABLE "perfiles_medico" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "colegiatura" TEXT,
    "tituloProfesional" TEXT,
    "nombreConsultorio" TEXT NOT NULL DEFAULT 'LilyMedical',
    "direccionConsultorio" TEXT,
    "telefonoConsultorio" TEXT,
    "firmaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfiles_medico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recetas" (
    "id" TEXT NOT NULL,
    "numeroReceta" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "tipo" "TipoReceta" NOT NULL,
    "diagnostico" TEXT,
    "indicacionesGenerales" TEXT,
    "codigoVerificacion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_receta" (
    "id" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "medicamento" TEXT,
    "presentacion" TEXT,
    "dosis" TEXT,
    "frecuencia" TEXT,
    "duracion" TEXT,
    "tipoTerapia" TEXT,
    "sesiones" INTEGER,
    "observaciones" TEXT,

    CONSTRAINT "items_receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constancias_medicas" (
    "id" TEXT NOT NULL,
    "numeroConstancia" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "diagnostico" TEXT,
    "codigoCIE10" TEXT,
    "diasReposo" INTEGER,
    "fechaInicioReposo" TIMESTAMP(3),
    "fechaFinReposo" TIMESTAMP(3),
    "motivo" TEXT NOT NULL,
    "codigoVerificacion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constancias_medicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_medico_usuarioId_key" ON "perfiles_medico"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_numeroReceta_key" ON "recetas"("numeroReceta");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_codigoVerificacion_key" ON "recetas"("codigoVerificacion");

-- CreateIndex
CREATE INDEX "recetas_pacienteId_idx" ON "recetas"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "constancias_medicas_numeroConstancia_key" ON "constancias_medicas"("numeroConstancia");

-- CreateIndex
CREATE UNIQUE INDEX "constancias_medicas_codigoVerificacion_key" ON "constancias_medicas"("codigoVerificacion");

-- CreateIndex
CREATE INDEX "constancias_medicas_pacienteId_idx" ON "constancias_medicas"("pacienteId");

-- AddForeignKey
ALTER TABLE "perfiles_medico" ADD CONSTRAINT "perfiles_medico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_receta" ADD CONSTRAINT "items_receta_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "recetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constancias_medicas" ADD CONSTRAINT "constancias_medicas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constancias_medicas" ADD CONSTRAINT "constancias_medicas_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constancias_medicas" ADD CONSTRAINT "constancias_medicas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
