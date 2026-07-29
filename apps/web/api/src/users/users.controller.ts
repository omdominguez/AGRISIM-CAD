import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { UsersService } from './users.service';
import { CrearUsuarioDto, ActualizarUsuarioDto } from './dto';

// Gestión de usuarios y roles: exclusivo del MASTER_ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.MASTER_ADMIN)
@Controller('usuarios')
export class UsersController {
  constructor(private service: UsersService) {}

  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.service.crear(dto);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto) {
    return this.service.actualizar(id, dto);
  }
}
