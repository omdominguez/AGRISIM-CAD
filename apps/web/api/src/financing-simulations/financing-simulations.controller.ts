import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { FinancingSimulationsService } from './financing-simulations.service';
import { CalcularSimulacionDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('simulaciones')
export class FinancingSimulationsController {
  constructor(private service: FinancingSimulationsService) {}

  @Post('calcular')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  calcular(@Body() dto: CalcularSimulacionDto) {
    return this.service.calcular(dto);
  }
}
