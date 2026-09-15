-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('MEDICO', 'ADMINISTRATIVO', 'PACIENTE');

-- CreateEnum
CREATE TYPE "SexoPaciente" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoEscala" AS ENUM ('BARTHEL', 'OSWESTRY', 'GONIOMETRICA', 'EVA', 'FUERZA_MUSCULAR', 'PERSONALIZADA');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('ASISTIO', 'INASISTIO', 'CANCELO');

-- CreateEnum
CREATE TYPE "TipoAdjunto" AS ENUM ('IMAGEN', 'PDF', 'INFORME', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PROGRAMADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'PAGADA', 'PARCIAL', 'ANULADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'SEGURO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoMovimientoInsumo" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateEnum
CREATE TYPE "AccionLog" AS ENUM ('VER', 'EDITAR', 'CREAR', 'ELIMINAR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "especialidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aseguradoras" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoConvenio" TEXT,
    "condiciones" TEXT,
    "contactoNombre" TEXT,
    "contactoTelefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aseguradoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" "SexoPaciente" NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "direccion" TEXT,
    "aseguradoraId" TEXT,
    "numeroAfiliacion" TEXT,
    "contactoEmergenciaNombre" TEXT,
    "contactoEmergenciaTelefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historias_clinicas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "motivoConsulta" TEXT,
    "diagnosticoPrincipal" TEXT,
    "codigoCIE10" TEXT,
    "antecedentesMedicos" TEXT,
    "antecedentesQuirurgicos" TEXT,
    "antecedentesFamiliares" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historias_clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones_fisiatricas" (
    "id" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "evaluadorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoEscala" "TipoEscala" NOT NULL,
    "nombreEscala" TEXT,
    "datos" JSONB NOT NULL,
    "puntajeTotal" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluaciones_fisiatricas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "citaId" TEXT,
    "terapeutaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notaEvolucion" TEXT NOT NULL,
    "tratamientoAplicado" TEXT,
    "asistencia" "EstadoAsistencia" NOT NULL DEFAULT 'ASISTIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjuntos" (
    "id" TEXT NOT NULL,
    "historiaClinicaId" TEXT NOT NULL,
    "tipo" "TipoAdjunto" NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "subidoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "tarifaId" TEXT,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PROGRAMADA',
    "esRecurrente" BOOLEAN NOT NULL DEFAULT false,
    "grupoRecurrenciaId" TEXT,
    "numeroSesionEnGrupo" INTEGER,
    "totalSesionesGrupo" INTEGER,
    "notas" TEXT,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueos_horario" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueos_horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas" (
    "id" TEXT NOT NULL,
    "nombreServicio" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "aseguradoraId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "numeroFactura" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "aseguradoraId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "impuestos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_detalles" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "tarifaId" TEXT NOT NULL,
    "citaId" TEXT,
    "sesionId" TEXT,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "factura_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "unidadMedida" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_insumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "tipo" "TipoMovimientoInsumo" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_acceso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "historiaClinicaId" TEXT,
    "accion" "AccionLog" NOT NULL,
    "detalle" TEXT,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_documento_key" ON "pacientes"("documento");

-- CreateIndex
CREATE INDEX "pacientes_documento_idx" ON "pacientes"("documento");

-- CreateIndex
CREATE INDEX "pacientes_telefono_idx" ON "pacientes"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "historias_clinicas_pacienteId_key" ON "historias_clinicas"("pacienteId");

-- CreateIndex
CREATE INDEX "evaluaciones_fisiatricas_historiaClinicaId_idx" ON "evaluaciones_fisiatricas"("historiaClinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_citaId_key" ON "sesiones"("citaId");

-- CreateIndex
CREATE INDEX "sesiones_historiaClinicaId_idx" ON "sesiones"("historiaClinicaId");

-- CreateIndex
CREATE INDEX "citas_profesionalId_fechaHoraInicio_idx" ON "citas"("profesionalId", "fechaHoraInicio");

-- CreateIndex
CREATE INDEX "citas_pacienteId_idx" ON "citas"("pacienteId");

-- CreateIndex
CREATE INDEX "citas_grupoRecurrenciaId_idx" ON "citas"("grupoRecurrenciaId");

-- CreateIndex
CREATE INDEX "bloqueos_horario_profesionalId_fechaHoraInicio_idx" ON "bloqueos_horario"("profesionalId", "fechaHoraInicio");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_numeroFactura_key" ON "facturas"("numeroFactura");

-- CreateIndex
CREATE INDEX "facturas_pacienteId_idx" ON "facturas"("pacienteId");

-- CreateIndex
CREATE INDEX "facturas_estado_idx" ON "facturas"("estado");

-- CreateIndex
CREATE INDEX "pagos_facturaId_idx" ON "pagos"("facturaId");

-- CreateIndex
CREATE INDEX "logs_acceso_pacienteId_idx" ON "logs_acceso"("pacienteId");

-- CreateIndex
CREATE INDEX "logs_acceso_usuarioId_idx" ON "logs_acceso"("usuarioId");

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_aseguradoraId_fkey" FOREIGN KEY ("aseguradoraId") REFERENCES "aseguradoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historias_clinicas" ADD CONSTRAINT "historias_clinicas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_fisiatricas" ADD CONSTRAINT "evaluaciones_fisiatricas_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_fisiatricas" ADD CONSTRAINT "evaluaciones_fisiatricas_evaluadorId_fkey" FOREIGN KEY ("evaluadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_terapeutaId_fkey" FOREIGN KEY ("terapeutaId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "tarifas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos_horario" ADD CONSTRAINT "bloqueos_horario_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_aseguradoraId_fkey" FOREIGN KEY ("aseguradoraId") REFERENCES "aseguradoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_aseguradoraId_fkey" FOREIGN KEY ("aseguradoraId") REFERENCES "aseguradoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_detalles" ADD CONSTRAINT "factura_detalles_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_detalles" ADD CONSTRAINT "factura_detalles_tarifaId_fkey" FOREIGN KEY ("tarifaId") REFERENCES "tarifas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_detalles" ADD CONSTRAINT "factura_detalles_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_detalles" ADD CONSTRAINT "factura_detalles_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_insumo" ADD CONSTRAINT "movimientos_insumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_insumo" ADD CONSTRAINT "movimientos_insumo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_acceso" ADD CONSTRAINT "logs_acceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_acceso" ADD CONSTRAINT "logs_acceso_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_acceso" ADD CONSTRAINT "logs_acceso_historiaClinicaId_fkey" FOREIGN KEY ("historiaClinicaId") REFERENCES "historias_clinicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
