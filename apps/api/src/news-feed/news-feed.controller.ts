import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NewsFeedService } from './news-feed.service';

@UseGuards(JwtAuthGuard)
@Controller('noticias')
export class NewsFeedController {
  constructor(private service: NewsFeedService) {}

  @Get()
  listar(@Query('region') region?: string) {
    return this.service.listar(region);
  }

  // Usado por el job de ingesta / o carga manual mientras se conecta la API externa.
  @Post()
  crear(@Body() data: any) {
    return this.service.crear(data);
  }
}
