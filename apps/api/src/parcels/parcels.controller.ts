import {
  Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { ParcelsService } from './parcels.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parcelas')
export class ParcelsController {
  constructor(private service: ParcelsService) {}

  @Get()
  listar() {
    return this.service.listar();
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
