import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { SolicitudesService } from './solicitudes.service';
import {
  CrearSolicitudDto, DefinirPaqueteDto, AprobarSolicitudDto, RechazarSolicitudDto,
  CrearContratoDto, CrearDespachoDto, CrearLiquidacionDto,
} from './dto';

const OPERATIVOS = [RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO];
const APRUEBA = [RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private service: SolicitudesService) {}

  // Lectura abierta a todos los roles autenticados (incluye Junta Directiva).
  @Get()
  listar(@Query('cicloId') cicloId?: string) {
    return this.service.listar(cicloId);
  }

  @Get('portafolio/resumen')
  resumenPortafolio() {
    return this.service.resumenPortafolio();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  // Paso 1 — lo abre el técnico tras evaluar la finca.
  @Post()
  @Roles(...OPERATIVOS)
  crear(@Body() dto: CrearSolicitudDto, @Req() req: any) {
    return this.service.crear(dto, req.user.userId);
  }

  // Paso 2 — paquete tecnológico y anticipo.
  @Post(':id/paquete')
  @Roles(...OPERATIVOS)
  definirPaquete(@Param('id') id: string, @Body() dto: DefinirPaqueteDto) {
    return this.service.definirPaquete(id, dto);
  }

  // Paso 3a — aprobación (solo Gerente/Master).
  @Post(':id/aprobar')
  @Roles(...APRUEBA)
  aprobar(@Param('id') id: string, @Body() dto: AprobarSolicitudDto, @Req() req: any) {
    return this.service.aprobar(id, dto, req.user.userId);
  }

  @Post(':id/rechazar')
  @Roles(...APRUEBA)
  rechazar(@Param('id') id: string, @Body() dto: RechazarSolicitudDto, @Req() req: any) {
    return this.service.rechazar(id, dto, req.user.userId);
  }

  // Paso 3b — contrato firmado.
  @Post(':id/contrato')
  @Roles(...APRUEBA)
  crearContrato(@Param('id') id: string, @Body() dto: CrearContratoDto) {
    return this.service.crearContrato(id, dto);
  }

  // Paso 4 — despacho de insumos / giro de anticipo.
  @Post(':id/despachos')
  @Roles(...OPERATIVOS)
  crearDespacho(@Param('id') id: string, @Body() dto: CrearDespachoDto, @Req() req: any) {
    return this.service.crearDespacho(id, dto, req.user.userId);
  }

  // Paso 6 — liquidación final (impacta cartera).
  @Post(':id/liquidar')
  @Roles(...APRUEBA)
  liquidar(@Param('id') id: string, @Body() dto: CrearLiquidacionDto, @Req() req: any) {
    return this.service.liquidar(id, dto, req.user.userId);
  }
}
