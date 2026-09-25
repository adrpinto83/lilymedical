-- Aviso emergente de la portada, gestionable desde la app.

-- CreateEnum
CREATE TYPE "TipoAvisoPortada" AS ENUM ('DEDICATORIA', 'COMERCIAL');

-- CreateTable
CREATE TABLE "avisos_portada" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAvisoPortada" NOT NULL DEFAULT 'COMERCIAL',
    "etiqueta" TEXT,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "firma" TEXT,
    "textoBoton" TEXT NOT NULL DEFAULT 'Entrar al sitio',
    "enlaceUrl" TEXT,
    "enlaceTexto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avisos_portada_pkey" PRIMARY KEY ("id")
);

-- Como mucho un aviso activo a la vez.
CREATE UNIQUE INDEX "avisos_portada_un_solo_activo" ON "avisos_portada" ("activo") WHERE "activo";

-- La dedicatoria de cumpleaños que estaba fija en la portada queda guardada
-- como histórico y sigue activa, así el sitio se ve igual tras migrar.
INSERT INTO "avisos_portada" ("id", "tipo", "etiqueta", "titulo", "mensaje", "firma", "textoBoton", "activo", "createdAt", "updatedAt")
VALUES (
  'b7a3c1d2-5e4f-4a6b-9c8d-0e1f2a3b4c5d',
  'DEDICATORIA',
  'Dedicatoria',
  '¡Feliz cumpleaños, Dra. Lilia!',
  E'Esta página está dedicada a la doctora más especial de mi vida.\n\nEs el regalo que te debía de tus dos últimos cumpleaños. Llega tarde, pero está hecho con todo el cariño del mundo.\n\nAunque la vida no nos tenga uno al lado del otro, como a mí me gustaría, quiero que sepas que siempre tendrás en mí a un eterno amigo que te quiere incondicionalmente y te querrá el resto de la vida.',
  '— AP ♡',
  'Entrar al sitio',
  true,
  '2026-09-24 14:22:30',
  CURRENT_TIMESTAMP
);
