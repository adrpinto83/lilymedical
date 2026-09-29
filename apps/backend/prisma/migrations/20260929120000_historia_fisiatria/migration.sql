-- Historia clínica: anamnesis, examen y plan propios de fisiatría.
ALTER TABLE "historias_clinicas" ADD COLUMN "ocupacion" TEXT,
ADD COLUMN "dominancia" TEXT,
ADD COLUMN "actividadFisica" TEXT,
ADD COLUMN "contraindicaciones" TEXT,
ADD COLUMN "examenFisico" TEXT,
ADD COLUMN "objetivosRehabilitacion" TEXT,
ADD COLUMN "planTerapeutico" TEXT;

-- Sesiones: dolor antes/después y modalidades aplicadas.
ALTER TABLE "sesiones" ADD COLUMN "evaPre" INTEGER,
ADD COLUMN "evaPost" INTEGER,
ADD COLUMN "modalidades" TEXT[] DEFAULT ARRAY[]::TEXT[];
