import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional,
  IsString, Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoFenologico, TipoIncidencia, TipoVisita } from '@prisma/client';

export class IncidenciaDto {
  @IsEnum(TipoIncidencia) tipo: TipoIncidencia;
  @IsString() nombreComun: string;
  @IsInt() @Min(1) @Max(5) severidad: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) porcentajeAfectado?: number;
  @IsOptional() @IsString() accionRecomendada?: string;
  @IsOptional() @IsString() aplicacionRealizada?: string;
}

export class CrearInspeccionDto {
  @IsDateString() fecha: string;
  @IsOptional() @IsString() loteId?: string; // si se omite, la visita es a nivel de participación
  @IsEnum(TipoVisita) tipoVisita: TipoVisita;

  // --- Solo aplica si tipoVisita = PREPARACION_TIERRA ---
  @IsOptional() @IsBoolean() prepArado?: boolean;
  @IsOptional() @IsBoolean() prepRastra?: boolean;
  @IsOptional() @IsBoolean() prepNivelacion?: boolean;
  @IsOptional() @IsBoolean() prepHumedadAdecuada?: boolean;

  // --- Solo aplica si tipoVisita = SIEMBRA ---
  @IsOptional() @IsString() metodoSiembra?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(50) profundidadSiembraCm?: number;

  // --- SEGUIMIENTO / COSECHA ---
  @IsOptional() @IsNumber() @Min(0) areaEfectivaHa?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(200) plantasPorMetroLineal?: number;
  @IsOptional() @IsEnum(EstadoFenologico) estadoFenologico?: EstadoFenologico;
  @IsOptional() @IsBoolean() usoAdecuadoInsumos?: boolean;
  @IsOptional() @IsNumber() @Min(0) rendimientoProyectadoQqHa?: number;

  @IsOptional() @IsString() observaciones?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => IncidenciaDto)
  incidencias?: IncidenciaDto[];
}
