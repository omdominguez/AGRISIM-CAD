import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Uso: @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
 * Si no se coloca el decorator, el endpoint es accesible por cualquier
 * usuario autenticado (pero sigue exigiendo JWT válido vía JwtAuthGuard).
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
