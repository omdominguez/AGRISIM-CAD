import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoriaInsumo } from '@prisma/client';

export class CrearInsumoDto {
  @IsString() nombre: string;
  @IsEnum(CategoriaInsumo) categoria: CategoriaInsumo;
  @IsString() unidad: string;
}

export class ActualizarInsumoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() unidad?: string;
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

export class ItemVentaDto {
  @IsString() insumoId: string;
  @IsNumber() @Min(0.01) cantidad: number;
}

export class CrearVentaDto {
  @IsString() solicitudId: string;
  @IsDateString() fecha: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La factura necesita al menos una línea.' })
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}
