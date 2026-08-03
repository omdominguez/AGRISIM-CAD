import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { InsumosService } from './insumos.service';
import { CrearInsumoDto, ActualizarInsumoDto, RegistrarCompraDto, RegistrarRetiroDto, CrearVentaDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('insumos')
export class InsumosController {
  constructor(private service: InsumosService) {}

  @Get()
  listarCatalogo() {
    return this.service.listarCatalogo();
  }

  @Get(':id')
  obtenerInsumo(@Param('id') id: string) {
    return this.service.obtenerInsumo(id);
  }

  @Post()
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  crearInsumo(@Body() dto: CrearInsumoDto) {
    return this.service.crearInsumo(dto.nombre, dto.categoria, dto.unidad);
  }

  @Patch(':id')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  actualizarInsumo(@Param('id') id: string, @Body() dto: ActualizarInsumoDto) {
    return this.service.actualizarInsumo(id, dto.nombre, dto.unidad);
  }

  @Delete(':id')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  eliminarInsumo(@Param('id') id: string) {
    return this.service.eliminarInsumo(id);
  }

  @Post(':id/compras')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE)
  registrarCompra(@Param('id') id: string, @Body() dto: RegistrarCompraDto, @Req() req: any) {
    return this.service.registrarCompra(id, dto.fecha, dto.cantidad, dto.costoUnitario, dto.proveedor, dto.notas, req.user.userId);
  }

  @Post('retiros')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  registrarRetiro(@Body() dto: RegistrarRetiroDto, @Req() req: any) {
    return this.service.registrarRetiro(dto.insumoId, dto.solicitudId, dto.fecha, dto.cantidad, req.user.userId);
  }

  @Get('solicitudes/:solicitudId/retiros')
  historialRetiros(@Param('solicitudId') solicitudId: string) {
    return this.service.historialRetiros(solicitudId);
  }

  // --- Módulo de Compras (vista global) ---
  @Get('compras/todas')
  listarTodasLasCompras() {
    return this.service.listarTodasLasCompras();
  }

  // --- Módulo de Ventas (facturas con varias líneas) ---
  @Get('ventas/todas')
  listarVentas() {
    return this.service.listarVentas();
  }

  @Get('ventas/solicitud/:solicitudId')
  obtenerVentasDeSolicitud(@Param('solicitudId') solicitudId: string) {
    return this.service.obtenerVentasDeSolicitud(solicitudId);
  }

  @Post('ventas')
  @Roles(RolUsuario.MASTER_ADMIN, RolUsuario.GERENTE, RolUsuario.TECNICO_CAMPO)
  crearVenta(@Body() dto: CrearVentaDto, @Req() req: any) {
    return this.service.crearVenta(dto.solicitudId, dto.fecha, dto.items, req.user.userId);
  }
}
