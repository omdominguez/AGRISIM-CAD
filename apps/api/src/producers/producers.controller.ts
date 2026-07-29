import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { ProducersService } from './producers.service';
import { CrearProductorDto, ActualizarProductorDto, CrearFincaDto } from './dto';

const OPERATIVOS = [RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('productores')
export class ProducersController {
  constructor(private service: ProducersService) {}

  @Get()
  listar(@Query('incluirInactivos') incluirInactivos?: string) {
    return this.service.listar(incluirInactivos !== 'true');
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Get(':id/fincas')
  listarFincas(@Param('id') id: string) {
    return this.service.listarFincas(id);
  }

  @Get(':id/desempeno-lotes')
  desempenoLotes(@Param('id') id: string) {
    return this.service.desempenoLotes(id);
  }

  @Post()
  @Roles(...OPERATIVOS)
  crear(@Body() dto: CrearProductorDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  @Roles(...OPERATIVOS)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProductorDto) {
    return this.service.actualizar(id, dto);
  }

  @Post(':id/fincas')
  @Roles(...OPERATIVOS)
  crearFinca(@Param('id') id: string, @Body() dto: CrearFincaDto) {
    return this.service.crearFinca(id, dto);
  }
}
