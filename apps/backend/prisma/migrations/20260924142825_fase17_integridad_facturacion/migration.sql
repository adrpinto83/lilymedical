-- Fase 17: integridad de facturación, reglas de aseguradora y correlativos atómicos.

-- AlterTable: reparto aseguradora/paciente congelado en la factura.
-- montoPaciente se agrega primero como opcional para poder rellenar las
-- facturas existentes con la misma regla que se usaba al vuelo hasta ahora
-- (sin % configurado, la aseguradora cubría el 100%).
ALTER TABLE "facturas" ADD COLUMN     "autorizacionId" TEXT,
ADD COLUMN     "montoAseguradora" DECIMAL(10,2),
ADD COLUMN     "montoPaciente" DECIMAL(10,2);

UPDATE "facturas" f
SET "montoAseguradora" = CASE
      WHEN a."porcentajeCobertura" IS NULL THEN f."total"
      ELSE ROUND(f."total" * a."porcentajeCobertura"::numeric / 100, 2)
    END
FROM "aseguradoras" a
WHERE f."aseguradoraId" = a."id";

UPDATE "facturas" SET "montoPaciente" = "total" - COALESCE("montoAseguradora", 0);

ALTER TABLE "facturas" ALTER COLUMN "montoPaciente" SET NOT NULL;

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anuladoEn" TIMESTAMP(3),
ADD COLUMN     "anuladoPorId" TEXT,
ADD COLUMN     "motivoAnulacion" TEXT;

-- CreateTable
CREATE TABLE "correlativos" (
    "serie" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,

    CONSTRAINT "correlativos_pkey" PRIMARY KEY ("serie")
);

-- Arranca cada serie desde el mayor número ya emitido (formato PREFIJO-AAAA-NNNNN).
INSERT INTO "correlativos" ("serie", "valor")
SELECT serie, MAX(valor) FROM (
  SELECT substring("numeroFactura" from '^(.*)-\d+$') AS serie,
         substring("numeroFactura" from '-(\d+)$')::int AS valor
    FROM "facturas" WHERE "numeroFactura" ~ '^[A-Z]+-\d{4}-\d+$'
  UNION ALL
  SELECT substring("numeroReceta" from '^(.*)-\d+$'),
         substring("numeroReceta" from '-(\d+)$')::int
    FROM "recetas" WHERE "numeroReceta" ~ '^[A-Z]+-\d{4}-\d+$'
  UNION ALL
  SELECT substring("numeroConstancia" from '^(.*)-\d+$'),
         substring("numeroConstancia" from '-(\d+)$')::int
    FROM "constancias_medicas" WHERE "numeroConstancia" ~ '^[A-Z]+-\d{4}-\d+$'
) emitidos
GROUP BY serie;

-- CreateIndex
CREATE INDEX "facturas_autorizacionId_idx" ON "facturas"("autorizacionId");

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_autorizacionId_fkey" FOREIGN KEY ("autorizacionId") REFERENCES "autorizaciones_seguro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
