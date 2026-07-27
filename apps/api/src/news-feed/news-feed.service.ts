import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

/**
 * Este servicio expone lo cacheado en BD. La ingesta real (llamadas a APIs
 * externas de clima/noticias) se recomienda hacerla en un job programado
 * (cron) separado — ver docs/ROADMAP.md, Fase 4 — para no depender de APIs
 * externas en el path de request del usuario.
 *
 * Fuentes sugeridas:
 *  - Clima: OpenWeatherMap o WeatherAPI (por región: Barinas, Portuguesa, etc.)
 *  - Noticias agrícolas/mercado: NewsAPI.org filtrado por palabras clave
 *    ("cosecha", "frijol", "precios agrícolas Venezuela", etc.)
 */
@Injectable()
export class NewsFeedService {
  constructor(private prisma: PrismaService) {}

  listar(region?: string) {
    return this.prisma.noticiaFeed.findMany({
      where: region ? { region } : undefined,
      orderBy: [{ relevancia: 'desc' }, { fechaPublicacion: 'desc' }],
      take: 50,
    });
  }

  crear(data: any) {
    return this.prisma.noticiaFeed.create({ data });
  }
}
