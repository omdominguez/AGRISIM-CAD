import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CategoriaInsumo, TipoContrato, TipoDespacho } from '@prisma/client';

// Paso 1 — abrir el expediente sobre una participación (productor dentro de un ciclo)
export class CrearSolicitudDto {
  @IsString() cicloProductorId: string;
  @IsOptional() @IsNumber() @Min(0) areaVerificadaHa?: number;
  @IsOptional() @IsString() evaluacionTecnica?: string;
}

// Paso 2 — paquete tecnológico
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

  @IsOptional() @IsNumber() @Min(0) margenInsumosPct?: number;  // default 0.30
  @IsOptional() @IsBoolean() solicitaAnticipo?: boolean;
  @IsOptional() @IsNumber() @Min(0) montoAnticipoSolicitado?: number;
  @IsOptional() @IsNumber() @Min(0) recargoAnticipoPct?: number; // default 0.05
}

// Paso 3 — aprobación y contrato
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
  @IsOptional() @IsNumber() @Min(0) montoEfectivo?: number;   // si tipo = ANTICIPO_EFECTIVO
  @IsOptional() itemsDespachadosJson?: any;
  @IsOptional() @IsNumber() @Min(0) valorDespachado?: number; // si tipo = INSUMOS
}

// Paso 6 — liquidación
export class CrearLiquidacionDto {
  @IsDateString() fecha: string;
  @IsOptional() @IsNumber() @Min(0) produccionRealQq?: number;
  @IsOptional() @IsNumber() @Min(0) precioLiquidacionQq?: number;
  @IsOptional() @IsNumber() @Min(0) valorCosechaRecibida?: number;
  @IsOptional() @IsString() notas?: string;
}
