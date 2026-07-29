import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TipoNoticia } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NewsFeedService } from './news-feed.service';

@UseGuards(JwtAuthGuard)
@Controller('noticias')
export class NewsFeedController {
  constructor(private service: NewsFeedService) {}

  @Get()
  listar(
    @Query('region') region?: string,
    @Query('rubro') rubro?: string,
    @Query('tipo') tipo?: TipoNoticia,
  ) {
    return this.service.listar({ region, rubro, tipo });
  }

  @Get('rubros')
  rubrosDisponibles() {
    return this.service.rubrosDisponibles();
  }

  @Get('clima')
  climaZonasAgricolas() {
    return this.service.climaZonasAgricolas();
  }

  @Get('commodities')
  preciosCommodities() {
    return this.service.preciosCommodities();
  }

  // Dispara la ingesta manual (además de la automática cada 6h).
  @Post('actualizar')
  actualizar() {
    return this.service.actualizarNoticiasAgricolas();
  }

  // Usado por carga manual mientras no hay fuente automática para un tema puntual.
  @Post()
  crear(@Body() data: any) {
    return this.service.crear(data);
  }
}
