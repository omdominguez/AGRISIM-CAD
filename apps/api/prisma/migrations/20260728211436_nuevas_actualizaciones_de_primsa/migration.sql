-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('MASTER_ADMIN', 'GERENTE', 'TECNICO_CAMPO', 'JUNTA_DIRECTIVA');

-- CreateEnum
CREATE TYPE "TipoCiclo" AS ENUM ('NORTE_VERANO', 'ZAFRA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('SOLICITUD_RECIBIDA', 'PAQUETE_DEFINIDO', 'APROBADA', 'CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO', 'COSECHADA', 'LIQUIDADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('SEMILLA', 'FERTILIZANTE', 'AGROQUIMICO', 'MECANIZACION', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('FINANCIAMIENTO_INSUMOS', 'COMPRA_VENTA', 'MIXTO');

-- CreateEnum
CREATE TYPE "TipoDespacho" AS ENUM ('INSUMOS', 'ANTICIPO_EFECTIVO');

-- CreateEnum
CREATE TYPE "TipoNoticia" AS ENUM ('CLIMA', 'PRECIOS_MERCADO', 'POLITICA_AGRICOLA', 'OTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ultimoLogin" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productores" (
    "id" TEXT NOT NULL,
    "codigoSima" TEXT,
    "nombre" TEXT NOT NULL,
    "cedulaRif" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "ubicacionZona" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fincas" (
    "id" TEXT NOT NULL,
    "productorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigoSima" TEXT,
    "municipio" TEXT,
    "estado" TEXT,
    "areaHectareas" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fincas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "nombreLote" TEXT NOT NULL,
    "codigoSima" TEXT,
    "areaHectareas" DECIMAL(10,2),
    "cultivo" TEXT,
    "geoJson" JSONB NOT NULL,
    "archivoOriginalUrl" TEXT,
    "centroideLat" DECIMAL(10,6),
    "centroideLng" DECIMAL(10,6),
    "cargadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCiclo" NOT NULL,
    "productorId" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "cultivo" TEXT NOT NULL,
    "areaHectareas" DECIMAL(10,2) NOT NULL,
    "rendimientoEsperadoQqHa" DECIMAL(10,2),
    "fechaSiembraEst" TIMESTAMP(3),
    "fechaCosechaEst" TIMESTAMP(3),
    "tecnicoResponsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ciclos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_financiamiento" (
    "id" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'SOLICITUD_RECIBIDA',
    "areaVerificadaHa" DECIMAL(10,2),
    "evaluacionTecnica" TEXT,
    "evaluadoPorId" TEXT,
    "fechaEvaluacion" TIMESTAMP(3),
    "margenInsumosPct" DECIMAL(5,4) NOT NULL DEFAULT 0.30,
    "solicitaAnticipo" BOOLEAN NOT NULL DEFAULT false,
    "montoAnticipoSolicitado" DECIMAL(14,2),
    "recargoAnticipoPct" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "montoAnticipoAprobado" DECIMAL(14,2),
    "aprobadoPorId" TEXT,
    "fechaAprobacion" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_financiamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquete_items" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "categoria" "CategoriaInsumo" NOT NULL,
    "nombreInsumo" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "etapaAplicacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paquete_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "tipo" "TipoContrato" NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "fechaFirma" TIMESTAMP(3) NOT NULL,
    "archivoUrl" TEXT,
    "compromisoEntregaCosecha" BOOLEAN NOT NULL DEFAULT true,
    "condicionesPago" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despachos" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "tipo" "TipoDespacho" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "etapaCultivo" TEXT,
    "montoEfectivo" DECIMAL(14,2),
    "itemsDespachadosJson" JSONB,
    "valorDespachado" DECIMAL(14,2) NOT NULL,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despachos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones_campo" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tecnicoId" TEXT NOT NULL,
    "usoAdecuadoInsumos" BOOLEAN,
    "estadoCultivo" TEXT,
    "observaciones" TEXT,
    "areaEfectivaHa" DECIMAL(10,2),
    "rendimientoProyectadoQqHa" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspecciones_campo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "costoInsumosBase" DECIMAL(14,2) NOT NULL,
    "montoInsumosConMargen" DECIMAL(14,2) NOT NULL,
    "montoAnticipoBase" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "montoAnticipoConRecargo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalACobrar" DECIMAL(14,2) NOT NULL,
    "gananciaCAD" DECIMAL(14,2) NOT NULL,
    "produccionRealQq" DECIMAL(14,2),
    "valorCosechaRecibida" DECIMAL(14,2),
    "saldoPendiente" DECIMAL(14,2),
    "estadoCobranza" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noticias_feed" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNoticia" NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "url" TEXT,
    "region" TEXT,
    "relevancia" INTEGER NOT NULL DEFAULT 1,
    "fechaPublicacion" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noticias_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "productores_codigoSima_key" ON "productores"("codigoSima");

-- CreateIndex
CREATE UNIQUE INDEX "fincas_codigoSima_key" ON "fincas"("codigoSima");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_codigoSima_key" ON "parcelas"("codigoSima");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_financiamiento_cicloId_key" ON "solicitudes_financiamiento"("cicloId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_solicitudId_key" ON "contratos"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numeroContrato_key" ON "contratos"("numeroContrato");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_solicitudId_key" ON "liquidaciones"("solicitudId");

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fincas" ADD CONSTRAINT "fincas_productorId_fkey" FOREIGN KEY ("productorId") REFERENCES "productores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "fincas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_cargadaPorId_fkey" FOREIGN KEY ("cargadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclos" ADD CONSTRAINT "ciclos_productorId_fkey" FOREIGN KEY ("productorId") REFERENCES "productores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclos" ADD CONSTRAINT "ciclos_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclos" ADD CONSTRAINT "ciclos_tecnicoResponsableId_fkey" FOREIGN KEY ("tecnicoResponsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_financiamiento" ADD CONSTRAINT "solicitudes_financiamiento_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_financiamiento" ADD CONSTRAINT "solicitudes_financiamiento_evaluadoPorId_fkey" FOREIGN KEY ("evaluadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_financiamiento" ADD CONSTRAINT "solicitudes_financiamiento_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paquete_items" ADD CONSTRAINT "paquete_items_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_campo" ADD CONSTRAINT "inspecciones_campo_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_campo" ADD CONSTRAINT "inspecciones_campo_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
