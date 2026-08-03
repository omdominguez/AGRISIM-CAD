import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { CyclesService } from './cycles.service';
import { CrearCicloDto, ActualizarCicloDto, InscribirProductorDto, AgregarLoteDto } from './dto';

const OPERATIVOS = [RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ciclos')
export class CyclesController {
  constructor(private service: CyclesService) {}

  // --- Lectura: todos los roles autenticados, incluida Junta Directiva ---
  @Get()
  listar() {
    return this.service.listar();
  }

  @Get('comparativo')
  comparativoCiclos(@Query('cultivo') cultivo?: string) {
    return this.service.comparativoCiclos(cultivo);
  }

  @Get('semaforo-general')
  semaforoGeneral() {
    return this.service.semaforoGeneral();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Get(':id/resumen')
  resumen(@Param('id') id: string) {
    return this.service.resumen(id);
  }

  @Get('participaciones/:participacionId')
  obtenerParticipacion(@Param('participacionId') id: string) {
    return this.service.obtenerParticipacion(id);
  }

  // --- Escritura: técnicos y roles administrativos ---
  @Post()
  @Roles(...OPERATIVOS)
  crear(@Body() dto: CrearCicloDto, @Req() req: any) {
    return this.service.crear(dto, req.user.userId);
  }

  @Patch(':id')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarCicloDto) {
    return this.service.actualizar(id, dto);
  }

  @Post(':id/productores')
  @Roles(...OPERATIVOS)
  inscribirProductor(@Param('id') cicloId: string, @Body() dto: InscribirProductorDto) {
    return this.service.inscribirProductor(cicloId, dto);
  }

  @Post('participaciones/:participacionId/lotes')
  @Roles(...OPERATIVOS)
  agregarLote(@Param('participacionId') id: string, @Body() dto: AgregarLoteDto) {
    return this.service.agregarLote(id, dto);
  }

  @Delete('lotes/:loteId')
  @Roles(...OPERATIVOS)
  eliminarLote(@Param('loteId') loteId: string) {
    return this.service.eliminarLote(loteId);
  }
}
