import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { ProveedoresService } from './proveedores.service';
import { CrearProveedorDto, ActualizarProveedorDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private service: ProveedoresService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Post()
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  crear(@Body() dto: CrearProveedorDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProveedorDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}
