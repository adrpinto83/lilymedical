-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MetodoPago" ADD VALUE 'PAGO_MOVIL';
ALTER TYPE "MetodoPago" ADD VALUE 'ZELLE';

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "montoBs" DECIMAL(14,2),
ADD COLUMN     "tasaCambio" DECIMAL(14,4);

