import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { CyclesService } from './cycles.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ciclos')
export class CyclesController {
  constructor(private service: CyclesService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Post()
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  crear(@Body() data: any) {
    return this.service.crear(data);
  }
}
