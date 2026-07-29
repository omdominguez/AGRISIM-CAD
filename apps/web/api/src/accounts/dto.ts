import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TipoMovimiento } from '@prisma/client';

export class CrearMovimientoDto {
  @IsString() productorId: string;
  @IsOptional() @IsString() cicloProductorId?: string;
  @IsEnum(TipoMovimiento) tipo: TipoMovimiento;
  @IsString() concepto: string;
  @IsDateString() fecha: string;
  @IsNumber() @Min(0.01) monto: number; // siempre positivo; el tipo define el signo
  @IsOptional() @IsString() referencia?: string;
}

export class ProyeccionCosechaDto {
  // Permite simular con un precio distinto al de referencia del ciclo.
  @IsOptional() @IsNumber() @Min(0) precioQq?: number;
}
