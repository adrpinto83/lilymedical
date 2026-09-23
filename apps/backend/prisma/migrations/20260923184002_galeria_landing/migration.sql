-- CreateTable
CREATE TABLE "fotos_galeria" (
    "id" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "pie" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "subidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fotos_galeria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fotos_galeria_archivo_key" ON "fotos_galeria"("archivo");

-- CreateIndex
CREATE INDEX "fotos_galeria_visible_orden_idx" ON "fotos_galeria"("visible", "orden");

-- AddForeignKey
ALTER TABLE "fotos_galeria" ADD CONSTRAINT "fotos_galeria_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
