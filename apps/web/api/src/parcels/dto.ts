import { ArrayMinSize, IsArray, IsString } from 'class-validator';

// Un punto es [longitud, latitud] — mismo orden que usa GeoJSON (y Leaflet
// internamente, aunque Leaflet muestre lat primero en pantalla).
export class CrearParcelaManualDto {
  @IsString() nombreLote: string;

  @IsArray()
  @ArrayMinSize(3, { message: 'Se necesitan al menos 3 puntos para formar un lote.' })
  coordenadas: [number, number][];
}
