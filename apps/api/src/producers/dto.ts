import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Lista cerrada de estados de Venezuela — el municipio se valida en el
// frontend contra el estado elegido (ver lib/venezuela-geo.ts en el web).
const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
  'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
  'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta',
  'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia',
];

export class CrearProductorDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() codigoSima?: string;
  @IsOptional() @IsString() cedulaRif?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsIn(ESTADOS_VENEZUELA) estado?: string;
  @IsOptional() @IsString() municipio?: string;
}

export class ActualizarProductorDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsIn(ESTADOS_VENEZUELA) estado?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
  @IsOptional() @IsNumber() @Min(0) indiceDesempeno?: number;
}

export class CrearFincaDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() codigoSima?: string;
  @IsOptional() @IsIn(ESTADOS_VENEZUELA) estado?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsNumber() @Min(0) areaHectareas?: number;
}
