import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { OrdenesCompraService } from './ordenes-compra.service';
import { CrearOrdenCompraDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private service: OrdenesCompraService) {}

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
  crear(@Body() dto: CrearOrdenCompraDto, @Req() req: any) {
    return this.service.crear(dto.proveedorId, dto.fecha, dto.items, req.user.userId);
  }
}
