import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearProveedorDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() rif?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() contacto?: string;
  @IsOptional() @IsString() notas?: string;
}

export class ActualizarProveedorDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() rif?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() contacto?: string;
  @IsOptional() @IsString() notas?: string;
}

export class ItemOrdenCompraDto {
  @IsString() insumoId: string;
  @IsNumber() @Min(0.01) cantidad: number;
  @IsNumber() @Min(0) costoUnitario: number;
}

export class CrearOrdenCompraDto {
  @IsString() proveedorId: string;
  @IsDateString() fecha: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La orden de compra necesita al menos una línea.' })
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenCompraDto)
  items: ItemOrdenCompraDto[];
}
