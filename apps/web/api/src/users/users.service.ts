import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CrearUsuarioDto, ActualizarUsuarioDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private authService: AuthService) {}

  async crear(dto: CrearUsuarioDto) {
    const passwordHash = await this.authService.hashPassword(dto.password);
    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rol: dto.rol,
        telefono: dto.telefono,
      },
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    });
  }

  listar() {
    return this.prisma.usuario.findMany({
      select: { id: true, nombre: true, email: true, rol: true, activo: true, ultimoLogin: true },
      orderBy: { nombre: 'asc' },
    });
  }

  actualizar(id: string, dto: ActualizarUsuarioDto) {
    return this.prisma.usuario.update({
      where: { id },
      data: dto,
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    });
  }
}
