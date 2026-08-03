-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('MASTER_ADMIN', 'GERENTE', 'TECNICO_CAMPO', 'JUNTA_DIRECTIVA');

-- CreateEnum
CREATE TYPE "TipoCiclo" AS ENUM ('NORTE_VERANO', 'INVIERNO');

-- CreateEnum
CREATE TYPE "EstadoCiclo" AS ENUM ('PLANIFICACION', 'EN_CURSO', 'COSECHA', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoFenologico" AS ENUM ('PREPARACION_TIERRA', 'SIEMBRA', 'EMERGENCIA', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6_O_MAS', 'FLORACION', 'LLENADO_GRANO', 'MADURACION', 'COSECHA');

-- CreateEnum
CREATE TYPE "TipoVisita" AS ENUM ('PREPARACION_TIERRA', 'SIEMBRA', 'SEGUIMIENTO', 'COSECHA');

-- CreateEnum
CREATE TYPE "TipoIncidencia" AS ENUM ('PLAGA', 'ENFERMEDAD', 'MALEZA', 'DEFICIENCIA_NUTRICIONAL', 'DANO_CLIMATICO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('SOLICITUD_RECIBIDA', 'PAQUETE_DEFINIDO', 'APROBADA', 'CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO', 'COSECHADA', 'LIQUIDADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('SEMILLA', 'FERTILIZANTE', 'AGROQUIMICO', 'MECANIZACION', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('FINANCIAMIENTO_INSUMOS', 'COMPRA_VENTA', 'MIXTO');

-- CreateEnum
CREATE TYPE "TipoDespacho" AS ENUM ('INSUMOS', 'ANTICIPO_EFECTIVO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('CARGO_INSUMOS', 'CARGO_ANTICIPO', 'CARGO_OTRO', 'ABONO_COSECHA', 'ABONO_PAGO', 'PAGO_A_PRODUCTOR');

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
    "estado" TEXT,
    "municipio" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "indiceDesempeno" DECIMAL(5,2),
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
    "geoJson" JSONB NOT NULL,
    "areaCalculadaHa" DECIMAL(10,4) NOT NULL,
    "areaDeclaradaHa" DECIMAL(10,2),
    "archivoOriginalUrl" TEXT,
    "centroideLat" DECIMAL(10,6),
    "centroideLng" DECIMAL(10,6),
    "cargadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_lluvia" (
    "id" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "mmEstimado" DECIMAL(6,2),
    "mmMedido" DECIMAL(6,2),
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_lluvia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCiclo" NOT NULL,
    "estado" "EstadoCiclo" NOT NULL DEFAULT 'PLANIFICACION',
    "cultivo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaCierreEst" TIMESTAMP(3),
    "metaProductores" INTEGER NOT NULL,
    "metaHectareas" DECIMAL(10,2) NOT NULL,
    "precioReferenciaQq" DECIMAL(12,2),
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ciclos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclo_productores" (
    "id" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "productorId" TEXT NOT NULL,
    "hectareasComprometidas" DECIMAL(10,2) NOT NULL,
    "tecnicoResponsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ciclo_productores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes_siembra" (
    "id" TEXT NOT NULL,
    "cicloProductorId" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "areaSembradaHa" DECIMAL(10,4) NOT NULL,
    "fechaSiembra" TIMESTAMP(3),
    "distanciaSurcosM" DECIMAL(5,3),
    "densidadObjetivoPlantasPorM" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_siembra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones_campo" (
    "id" TEXT NOT NULL,
    "cicloProductorId" TEXT NOT NULL,
    "loteId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tecnicoId" TEXT NOT NULL,
    "tipoVisita" "TipoVisita" NOT NULL DEFAULT 'SEGUIMIENTO',
    "prepArado" BOOLEAN,
    "prepRastra" BOOLEAN,
    "prepNivelacion" BOOLEAN,
    "prepHumedadAdecuada" BOOLEAN,
    "metodoSiembra" TEXT,
    "profundidadSiembraCm" DECIMAL(5,2),
    "areaEfectivaHa" DECIMAL(10,4),
    "plantasPorMetroLineal" DECIMAL(6,2),
    "plantasEstimadasTotal" DECIMAL(14,0),
    "plantasObjetivoTotal" DECIMAL(14,0),
    "porcentajeLogroPoblacion" DECIMAL(6,4),
    "estadoFenologico" "EstadoFenologico",
    "usoAdecuadoInsumos" BOOLEAN,
    "rendimientoProyectadoQqHa" DECIMAL(10,2),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspecciones_campo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias" (
    "id" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "tipo" "TipoIncidencia" NOT NULL,
    "nombreComun" TEXT NOT NULL,
    "severidad" INTEGER NOT NULL,
    "porcentajeAfectado" DECIMAL(5,2),
    "accionRecomendada" TEXT,
    "aplicacionRealizada" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_financiamiento" (
    "id" TEXT NOT NULL,
    "cicloProductorId" TEXT NOT NULL,
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
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaInsumo" NOT NULL,
    "unidad" TEXT NOT NULL,
    "stockActual" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costoPromedioPonderado" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_insumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "costoUnitario" DECIMAL(14,4) NOT NULL,
    "proveedor" TEXT,
    "notas" TEXT,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retiros_insumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "costoUnitarioAlMomento" DECIMAL(14,4) NOT NULL,
    "costoTotal" DECIMAL(14,2) NOT NULL,
    "montoCobradoConMargen" DECIMAL(14,2) NOT NULL,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retiros_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "numeroFactura" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "subtotalCosto" DECIMAL(14,2) NOT NULL,
    "totalConMargen" DECIMAL(14,2) NOT NULL,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_items" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "costoUnitarioAlMomento" DECIMAL(14,4) NOT NULL,
    "costoTotal" DECIMAL(14,2) NOT NULL,
    "montoCobradoConMargen" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id")
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
    "precioLiquidacionQq" DECIMAL(12,2),
    "valorCosechaRecibida" DECIMAL(14,2),
    "saldoPendiente" DECIMAL(14,2),
    "estadoCobranza" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_cuenta" (
    "id" TEXT NOT NULL,
    "productorId" TEXT NOT NULL,
    "cicloProductorId" TEXT,
    "tipo" "TipoMovimiento" NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "referencia" TEXT,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_cuenta_pkey" PRIMARY KEY ("id")
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
    "rubro" TEXT,
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
CREATE UNIQUE INDEX "productores_cedulaRif_key" ON "productores"("cedulaRif");

-- CreateIndex
CREATE UNIQUE INDEX "fincas_codigoSima_key" ON "fincas"("codigoSima");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_codigoSima_key" ON "parcelas"("codigoSima");

-- CreateIndex
CREATE UNIQUE INDEX "registros_lluvia_parcelaId_fecha_key" ON "registros_lluvia"("parcelaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ciclos_nombre_key" ON "ciclos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ciclo_productores_cicloId_productorId_key" ON "ciclo_productores"("cicloId", "productorId");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_siembra_cicloProductorId_parcelaId_key" ON "lotes_siembra"("cicloProductorId", "parcelaId");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_financiamiento_cicloProductorId_key" ON "solicitudes_financiamiento"("cicloProductorId");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_numeroFactura_key" ON "ventas"("numeroFactura");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_solicitudId_key" ON "contratos"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numeroContrato_key" ON "contratos"("numeroContrato");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_solicitudId_key" ON "liquidaciones"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "noticias_feed_url_key" ON "noticias_feed"("url");

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fincas" ADD CONSTRAINT "fincas_productorId_fkey" FOREIGN KEY ("productorId") REFERENCES "productores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "fincas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_cargadaPorId_fkey" FOREIGN KEY ("cargadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_lluvia" ADD CONSTRAINT "registros_lluvia_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_lluvia" ADD CONSTRAINT "registros_lluvia_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclos" ADD CONSTRAINT "ciclos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_productores" ADD CONSTRAINT "ciclo_productores_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_productores" ADD CONSTRAINT "ciclo_productores_productorId_fkey" FOREIGN KEY ("productorId") REFERENCES "productores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_productores" ADD CONSTRAINT "ciclo_productores_tecnicoResponsableId_fkey" FOREIGN KEY ("tecnicoResponsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_siembra" ADD CONSTRAINT "lotes_siembra_cicloProductorId_fkey" FOREIGN KEY ("cicloProductorId") REFERENCES "ciclo_productores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_siembra" ADD CONSTRAINT "lotes_siembra_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_campo" ADD CONSTRAINT "inspecciones_campo_cicloProductorId_fkey" FOREIGN KEY ("cicloProductorId") REFERENCES "ciclo_productores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_campo" ADD CONSTRAINT "inspecciones_campo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes_siembra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_campo" ADD CONSTRAINT "inspecciones_campo_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "inspecciones_campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_financiamiento" ADD CONSTRAINT "solicitudes_financiamiento_cicloProductorId_fkey" FOREIGN KEY ("cicloProductorId") REFERENCES "ciclo_productores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_financiamiento" ADD CONSTRAINT "solicitudes_financiamiento_evaluadoPorId_fkey" FOREIGN KEY ("evaluadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_financiamiento" ADD CONSTRAINT "solicitudes_financiamiento_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paquete_items" ADD CONSTRAINT "paquete_items_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_insumo" ADD CONSTRAINT "compras_insumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_insumo" ADD CONSTRAINT "compras_insumo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros_insumo" ADD CONSTRAINT "retiros_insumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros_insumo" ADD CONSTRAINT "retiros_insumo_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiros_insumo" ADD CONSTRAINT "retiros_insumo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_financiamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cuenta" ADD CONSTRAINT "movimientos_cuenta_productorId_fkey" FOREIGN KEY ("productorId") REFERENCES "productores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cuenta" ADD CONSTRAINT "movimientos_cuenta_cicloProductorId_fkey" FOREIGN KEY ("cicloProductorId") REFERENCES "ciclo_productores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_cuenta" ADD CONSTRAINT "movimientos_cuenta_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
