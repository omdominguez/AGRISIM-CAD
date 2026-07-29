import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearProductorDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() codigoSima?: string;
  @IsOptional() @IsString() cedulaRif?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() ubicacionZona?: string;
}

export class ActualizarProductorDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() ubicacionZona?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
  @IsOptional() @IsNumber() @Min(0) indiceDesempeno?: number;
}

export class CrearFincaDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() codigoSima?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsNumber() @Min(0) areaHectareas?: number;
}
