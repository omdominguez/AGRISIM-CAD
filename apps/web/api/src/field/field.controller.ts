import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { FieldService } from './field.service';
import { CrearInspeccionDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campo')
export class FieldController {
  constructor(private service: FieldService) {}

  // El técnico registra la visita. Es su carga de trabajo principal.
  @Post('participaciones/:participacionId/inspecciones')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  crearInspeccion(
    @Param('participacionId') id: string,
    @Body() dto: CrearInspeccionDto,
    @Req() req: any,
  ) {
    return this.service.crearInspeccion(id, dto, req.user.userId);
  }

  @Get('participaciones/:participacionId/inspecciones')
  listarInspecciones(@Param('participacionId') id: string) {
    return this.service.listarInspecciones(id);
  }

  @Get('ciclos/:cicloId/fitosanitario')
  panelFitosanitario(@Param('cicloId') cicloId: string) {
    return this.service.panelFitosanitario(cicloId);
  }
}
