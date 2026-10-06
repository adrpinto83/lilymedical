-- CreateTable
CREATE TABLE "informes_medicos" (
    "id" TEXT NOT NULL,
    "numeroInforme" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "informe" TEXT NOT NULL,
    "indicaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "informes_medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos" (
    "id" TEXT NOT NULL,
    "numeroPresupuesto" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnostico" TEXT,
    "tasaCambio" DECIMAL(14,4),
    "total" DECIMAL(10,2) NOT NULL,
    "notas" TEXT,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuesto_items" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "tarifaId" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "presupuesto_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "informes_medicos_numeroInforme_key" ON "informes_medicos"("numeroInforme");

-- CreateIndex
CREATE INDEX "informes_medicos_pacienteId_idx" ON "informes_medicos"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_numeroPresupuesto_key" ON "presupuestos"("numeroPresupuesto");

-- CreateIndex
CREATE INDEX "presupuestos_pacienteId_idx" ON "presupuestos"("pacienteId");

-- CreateIndex
CREATE INDEX "presupuesto_items_presupuestoId_idx" ON "presupuesto_items"("presupuestoId");

-- AddForeignKey
ALTER TABLE "informes_medicos" ADD CONSTRAINT "informes_medicos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes_medicos" ADD CONSTRAINT "informes_medicos_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes_medicos" ADD CONSTRAINT "informes_medicos_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_items" ADD CONSTRAINT "presupuesto_items_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "presupuestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuesto_items" ADD CONSTRAINT "presupuesto_items_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "tarifas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

