import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { AccountsService } from './accounts.service';
import { CrearMovimientoDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cuentas')
export class AccountsController {
  constructor(private service: AccountsService) {}

  @Get('cartera')
  cartera() {
    return this.service.cartera();
  }

  @Get('productores/:productorId')
  estadoDeCuenta(@Param('productorId') id: string) {
    return this.service.estadoDeCuenta(id);
  }

  // Proyección de efectivo necesario para pagar a los productores en cosecha.
  @Get('ciclos/:cicloId/proyeccion-efectivo')
  proyeccion(@Param('cicloId') cicloId: string, @Query('precioQq') precioQq?: string) {
    return this.service.proyeccionEfectivoCosecha(
      cicloId,
      precioQq ? Number(precioQq) : undefined,
    );
  }

  // Movimientos manuales (entregas de cosecha, pagos). Los cargos por despacho
  // y liquidación se generan automáticamente desde el módulo de solicitudes.
  @Post('movimientos')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  crearMovimiento(@Body() dto: CrearMovimientoDto, @Req() req: any) {
    return this.service.crearMovimiento(dto, req.user.userId);
  }
}
