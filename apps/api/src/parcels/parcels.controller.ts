import {
  Controller, Get, Post, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { ParcelsService } from './parcels.service';
import { CrearParcelaManualDto, RegistrarLluviaDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parcelas')
export class ParcelsController {
  constructor(private service: ParcelsService) {}

  @Get()
  listar(@Query('fincaId') fincaId?: string) {
    return this.service.listar(fincaId);
  }

  @Get('mapa')
  listarParaMapa() {
    return this.service.listarParaMapa();
  }

  @Get('alertas-lluvia')
  alertasLluvia() {
    return this.service.alertasLluvia();
  }

  @Get(':id/historial-lluvia')
  historialLluvia(@Param('id') id: string) {
    return this.service.historialLluvia(id);
  }

  // El técnico registra lo que midió en su pluviómetro (manda sobre el estimado automático).
  @Post(':id/lluvia')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  registrarLluviaManual(
    @Param('id') id: string,
    @Body() body: RegistrarLluviaDto,
    @Req() req: any,
  ) {
    return this.service.registrarLluviaManual(id, body.fecha, body.mmMedido, req.user.userId);
  }

  // Lote dibujado a mano en el mapa (alternativa a importar KML).
  @Post('manual/:fincaId')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  crearManual(
    @Param('fincaId') fincaId: string,
    @Body() dto: CrearParcelaManualDto,
    @Req() req: any,
  ) {
    return this.service.crearManual(fincaId, dto.nombreLote, dto.coordenadas, req.user.userId);
  }

  // Solo técnicos de campo y roles administrativos pueden importar datos de SIMA.
  @Post('importar-kml/:fincaId')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  @UseInterceptors(FileInterceptor('file'))
  importar(
    @Param('fincaId') fincaId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.importarKml(fincaId, file, req.user.userId);
  }
}
