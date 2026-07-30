import {
  IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min,
} from 'class-validator';
import { TipoCiclo, EstadoCiclo } from '@prisma/client';

// --- Paso 1: abrir el ciclo-campaña ---
export class CrearCicloDto {
  @IsString() nombre: string;              // "Norte Verano 2026-2027"
  @IsEnum(TipoCiclo) tipo: TipoCiclo;      // NORTE_VERANO | INVIERNO
  @IsString() cultivo: string;
  @IsDateString() fechaInicio: string;
  @IsOptional() @IsDateString() fechaCierreEst?: string;

  @IsInt() @Min(1) metaProductores: number;
  @IsNumber() @Min(0.01) metaHectareas: number;

  @IsOptional() @IsNumber() @Min(0) precioReferenciaQq?: number;
}

export class ActualizarCicloDto {
  @IsOptional() @IsEnum(EstadoCiclo) estado?: EstadoCiclo;
  @IsOptional() @IsDateString() fechaCierreEst?: string;
  @IsOptional() @IsNumber() @Min(0) precioReferenciaQq?: number;
  @IsOptional() @IsInt() @Min(1) metaProductores?: number;
  @IsOptional() @IsNumber() @Min(0.01) metaHectareas?: number;
}

// --- Paso 2: inscribir un productor en el ciclo ---
export class InscribirProductorDto {
  @IsString() productorId: string;
  @IsNumber() @Min(0.01) hectareasComprometidas: number;
  @IsOptional() @IsString() tecnicoResponsableId?: string;
}

// --- Paso 3: agregar los lotes que ese productor va a sembrar ---
// El área NO se envía: la toma el sistema de parcela.areaCalculadaHa (KML).
export class AgregarLoteDto {
  @IsString() parcelaId: string;
  @IsOptional() @IsDateString() fechaSiembra?: string;

  @IsOptional() @IsNumber()
  @Min(0.01, { message: 'La distancia entre surcos debe ser mayor a 0.' })
  @Max(5, { message: 'La distancia entre surcos parece muy alta (máximo 5 m) — revisa si escribiste centímetros por error.' })
  distanciaSurcosM?: number;

  @IsOptional() @IsNumber()
  @Min(0.01, { message: 'La densidad objetivo debe ser mayor a 0.' })
  @Max(200, { message: 'La densidad objetivo parece muy alta (máximo 200 plantas/m) — revisa si escribiste plantas por hectárea en vez de por metro lineal.' })
  densidadObjetivoPlantasPorM?: number;
}
