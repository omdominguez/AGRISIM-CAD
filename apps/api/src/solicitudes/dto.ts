import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoriaInsumo, TipoContrato, TipoDespacho } from '@prisma/client';

// Paso 1 — abrir el expediente a partir de un Ciclo ya creado
export class CrearSolicitudDto {
  @IsString() cicloId: string;
  @IsOptional() @IsNumber() @Min(0) areaVerificadaHa?: number;
  @IsOptional() @IsString() evaluacionTecnica?: string;
}

// Paso 2 — items del paquete tecnológico
export class ItemPaqueteDto {
  @IsEnum(CategoriaInsumo) categoria: CategoriaInsumo;
  @IsString() nombreInsumo: string;
  @IsString() unidad: string;
  @IsNumber() @Min(0) cantidad: number;
  @IsNumber() @Min(0) costoUnitario: number;
  @IsOptional() @IsString() etapaAplicacion?: string;
}

export class DefinirPaqueteDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemPaqueteDto)
  items: ItemPaqueteDto[];

  @IsOptional() @IsNumber() @Min(0) margenInsumosPct?: number; // default 0.30

  @IsOptional() @IsBoolean() solicitaAnticipo?: boolean;
  @IsOptional() @IsNumber() @Min(0) montoAnticipoSolicitado?: number;
  @IsOptional() @IsNumber() @Min(0) recargoAnticipoPct?: number; // default 0.05
}

// Paso 3 — aprobación
export class AprobarSolicitudDto {
  @IsOptional() @IsNumber() @Min(0) montoAnticipoAprobado?: number;
  @IsOptional() @IsString() notas?: string;
}

export class RechazarSolicitudDto {
  @IsString() motivoRechazo: string;
}

export class CrearContratoDto {
  @IsEnum(TipoContrato) tipo: TipoContrato;
  @IsString() numeroContrato: string;
  @IsDateString() fechaFirma: string;
  @IsOptional() @IsString() archivoUrl?: string;
  @IsOptional() @IsBoolean() compromisoEntregaCosecha?: boolean;
  @IsOptional() @IsString() condicionesPago?: string;
}

// Paso 4 — despacho / desembolso
export class CrearDespachoDto {
  @IsEnum(TipoDespacho) tipo: TipoDespacho;
  @IsDateString() fecha: string;
  @IsOptional() @IsString() etapaCultivo?: string;
  @IsOptional() @IsNumber() @Min(0) montoEfectivo?: number; // requerido si tipo = ANTICIPO_EFECTIVO
  @IsOptional() itemsDespachadosJson?: any;
  @IsOptional() @IsNumber() @Min(0) valorDespachado?: number; // requerido si tipo = INSUMOS (valor $ de lo entregado)
}

// Paso 5 — inspección de campo
export class CrearInspeccionDto {
  @IsDateString() fecha: string;
  @IsOptional() @IsBoolean() usoAdecuadoInsumos?: boolean;
  @IsOptional() @IsString() estadoCultivo?: string;
  @IsOptional() @IsString() observaciones?: string;
  // Actualización operativa de campo — alimenta la página de Resumen de Ciclo.
  @IsOptional() @IsNumber() @Min(0) areaEfectivaHa?: number;
  @IsOptional() @IsNumber() @Min(0) rendimientoProyectadoQqHa?: number;
}

// Paso 6 — liquidación
export class CrearLiquidacionDto {
  @IsDateString() fecha: string;
  @IsOptional() @IsNumber() @Min(0) produccionRealQq?: number;
  @IsOptional() @IsNumber() @Min(0) valorCosechaRecibida?: number;
  @IsOptional() @IsString() notas?: string;
}
