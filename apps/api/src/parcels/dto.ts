import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Un punto es [longitud, latitud] — mismo orden que usa GeoJSON (y Leaflet
// internamente, aunque Leaflet muestre lat primero en pantalla).
export class CrearParcelaManualDto {
  @IsString() nombreLote: string;

  @IsArray()
  @ArrayMinSize(3, { message: 'Se necesitan al menos 3 puntos para formar un lote.' })
  coordenadas: [number, number][];
}

export class RegistrarLluviaDto {
  @IsDateString() fecha: string;
  @IsNumber() @Min(0) mmMedido: number;
}

export class ActualizarParcelaDto {
  @IsOptional() @IsString() nombreLote?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3, { message: 'Se necesitan al menos 3 puntos para formar un lote.' })
  coordenadas?: [number, number][];
}
