import { IsEmail, IsEnum, IsString, MinLength, IsOptional } from 'class-validator';
import { RolUsuario } from '@prisma/client';

export class CrearUsuarioDto {
  @IsString() nombre: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(RolUsuario) rol: RolUsuario;
  @IsOptional() @IsString() telefono?: string;
}

export class ActualizarUsuarioDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEnum(RolUsuario) rol?: RolUsuario;
  @IsOptional() activo?: boolean;
}
