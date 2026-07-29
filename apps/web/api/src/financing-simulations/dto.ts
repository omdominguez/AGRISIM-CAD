import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Calculadora rápida: estima el cobro y la ganancia de CAD para un paquete
// tecnológico + anticipo opcional, ANTES de abrir un expediente formal.
// Usa la misma fórmula real del flujo de financiamiento:
//   Cobro = (Costo Insumos x (1 + margenInsumos)) + (Anticipo x (1 + recargoAnticipo))
export class CalcularSimulacionDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() cultivo?: string;

  @IsNumber() @Min(0) costoTotalInsumos: number; // suma del paquete tecnológico (semilla, fert., etc.)
  @IsOptional() @IsNumber() @Min(0) margenInsumosPct?: number; // default 0.30

  @IsOptional() @IsBoolean() solicitaAnticipo?: boolean;
  @IsOptional() @IsNumber() @Min(0) montoAnticipo?: number;
  @IsOptional() @IsNumber() @Min(0) recargoAnticipoPct?: number; // default 0.05

  // Opcional: si se quiere ver también el margen bruto contra la cosecha esperada.
  @IsOptional() @IsNumber() @Min(0) rendimientoEsperadoQqHa?: number;
  @IsOptional() @IsNumber() @Min(0) areaHectareas?: number;
  @IsOptional() @IsNumber() @Min(0) precioVentaQq?: number;
}
