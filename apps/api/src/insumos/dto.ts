import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CategoriaInsumo } from '@prisma/client';

export class CrearInsumoDto {
  @IsString() nombre: string;
  @IsEnum(CategoriaInsumo) categoria: CategoriaInsumo;
  @IsString() unidad: string;
}

export class RegistrarCompraDto {
  @IsDateString() fecha: string;
  @IsNumber() @Min(0.01) cantidad: number;
  @IsNumber() @Min(0) costoUnitario: number;
  @IsOptional() @IsString() proveedor?: string;
  @IsOptional() @IsString() notas?: string;
}

export class RegistrarRetiroDto {
  @IsString() insumoId: string;
  @IsString() solicitudId: string;
  @IsDateString() fecha: string;
  @IsNumber() @Min(0.01) cantidad: number;
}
