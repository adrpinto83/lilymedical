-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO', 'DADO_DE_BAJA');

-- CreateEnum
CREATE TYPE "TipoMantenimiento" AS ENUM ('PREVENTIVO', 'CORRECTIVO', 'CALIBRACION');

-- CreateTable
CREATE TABLE "equipos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "numeroSerie" TEXT,
    "ubicacion" TEXT,
    "fechaAdquisicion" TIMESTAMP(3),
    "garantiaHasta" TIMESTAMP(3),
    "proveedorServicio" TEXT,
    "estado" "EstadoEquipo" NOT NULL DEFAULT 'OPERATIVO',
    "frecuenciaMantenimientoDias" INTEGER,
    "ultimoMantenimiento" TIMESTAMP(3),
    "proximoMantenimiento" TIMESTAMP(3),
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimientos_equipo" (
    "id" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "tipo" "TipoMantenimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "realizadoPor" TEXT,
    "costo" DECIMAL(10,2),
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mantenimientos_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipos_numeroSerie_key" ON "equipos"("numeroSerie");

-- CreateIndex
CREATE INDEX "mantenimientos_equipo_equipoId_fecha_idx" ON "mantenimientos_equipo"("equipoId", "fecha");

-- AddForeignKey
ALTER TABLE "mantenimientos_equipo" ADD CONSTRAINT "mantenimientos_equipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mantenimientos_equipo" ADD CONSTRAINT "mantenimientos_equipo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
