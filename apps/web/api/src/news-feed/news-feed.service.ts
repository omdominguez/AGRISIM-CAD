import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { TipoNoticia } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { buscarNoticiasGoogleNews } from './google-news-rss.util';

// Zonas de interés agrícola de CAD (llanos venezolanos, foco de sus ciclos).
const ZONAS_AGRICOLAS = [
  { nombre: 'Barinas', estado: 'Barinas', lat: 8.6226, lng: -70.2075 },
  { nombre: 'Guanare', estado: 'Portuguesa', lat: 9.0409, lng: -69.7477 },
  { nombre: 'San Fernando de Apure', estado: 'Apure', lat: 7.8939, lng: -67.4776 },
  { nombre: 'San Carlos', estado: 'Cojedes', lat: 9.6614, lng: -68.5804 },
  { nombre: 'Calabozo', estado: 'Guárico', lat: 8.9242, lng: -67.4272 },
  { nombre: 'Acarigua', estado: 'Portuguesa', lat: 9.5500, lng: -69.2000 },
];

const DESCRIPCION_CODIGO_CLIMA: Record<number, string> = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Neblina', 48: 'Neblina con escarcha',
  51: 'Llovizna leve', 53: 'Llovizna moderada', 55: 'Llovizna densa',
  61: 'Lluvia leve', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
  80: 'Chubascos leves', 81: 'Chubascos moderados', 82: 'Chubascos fuertes',
  95: 'Tormenta eléctrica', 96: 'Tormenta con granizo leve', 99: 'Tormenta con granizo fuerte',
};

let cacheClima: { data: any[]; expira: number } | null = null;
const TTL_CACHE_CLIMA_MS = 15 * 60 * 1000;

// Commodities agrícolas relevantes — símbolos de futuros de Yahoo Finance.
// "ZC=F" etc. son los tickers estándar de commodities en bolsas de EE.UU.
// (CME/CBOT), la referencia internacional de precio para estos productos.
// Cada uno cotiza en una unidad distinta (bushel, cwt, libra) — por eso
// cada uno trae su propio factor de conversión a kilogramo.
const COMMODITIES = [
  // Maíz: cotiza en US¢/bushel. 1 bushel de maíz = 25.401 kg.
  { simbolo: 'ZC=F', nombre: 'Maíz', unidadOriginal: 'US¢/bushel', enCentavos: true, kgPorUnidad: 25.401 },
  // Arroz: cotiza en US$/cwt (quintal = 100 lb). 1 cwt = 45.3592 kg.
  { simbolo: 'ZR=F', nombre: 'Arroz', unidadOriginal: 'US$/cwt', enCentavos: false, kgPorUnidad: 45.3592 },
  // Azúcar: cotiza en US¢/libra. 1 libra = 0.453592 kg.
  { simbolo: 'SB=F', nombre: 'Azúcar', unidadOriginal: 'US¢/lb', enCentavos: true, kgPorUnidad: 0.453592 },
  // Soya: cotiza en US¢/bushel. 1 bushel de soya = 27.2155 kg.
  { simbolo: 'ZS=F', nombre: 'Soya', unidadOriginal: 'US¢/bushel', enCentavos: true, kgPorUnidad: 27.2155 },
  // Trigo: cotiza en US¢/bushel. 1 bushel de trigo = 27.2155 kg.
  { simbolo: 'ZW=F', nombre: 'Trigo', unidadOriginal: 'US¢/bushel', enCentavos: true, kgPorUnidad: 27.2155 },
];

let cacheCommodities: { data: any[]; expira: number } | null = null;
const TTL_CACHE_COMMODITIES_MS = 15 * 60 * 1000;

/**
 * RUBROS de interés — cada uno con su búsqueda en Google News RSS.
 * Se buscan en inglés (mercado internacional de commodities) y en español
 * (Venezuela específicamente), y se etiquetan con el mismo `rubro` para
 * poder filtrar en la UI sin importar el idioma de la fuente.
 */
const RUBROS_BUSQUEDA: Array<{
  rubro: string;
  consultas: Array<{ query: string; idioma: 'es-419' | 'en-US'; region: 'VE' | 'US' }>;
}> = [
  {
    rubro: 'Frijol Mung',
    consultas: [
      { query: 'mung bean price market', idioma: 'en-US', region: 'US' },
      { query: 'frijol mung Venezuela precio', idioma: 'es-419', region: 'VE' },
    ],
  },
  {
    rubro: 'Caraota Negra',
    consultas: [
      { query: 'black bean price international market', idioma: 'en-US', region: 'US' },
      { query: 'caraota negra Venezuela precio cosecha', idioma: 'es-419', region: 'VE' },
    ],
  },
  {
    rubro: 'Maíz',
    consultas: [
      { query: 'corn price market international', idioma: 'en-US', region: 'US' },
      { query: 'maíz Venezuela cosecha precio', idioma: 'es-419', region: 'VE' },
    ],
  },
  {
    rubro: 'Mercado General',
    consultas: [
      { query: 'legume commodity prices international', idioma: 'en-US', region: 'US' },
      { query: 'agricultura Venezuela llanos cosecha', idioma: 'es-419', region: 'VE' },
    ],
  },
];

@Injectable()
export class NewsFeedService implements OnModuleInit {
  private readonly logger = new Logger(NewsFeedService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Primera carga al arrancar el backend, y luego cada 6 horas mientras
    // el proceso siga corriendo. No bloquea el arranque (no se espera el
    // await) — si falla, solo se registra el error, el servidor sigue.
    this.actualizarNoticiasAgricolas().catch((e) => this.logger.warn(`Ingesta inicial de noticias falló: ${e.message}`));
    setInterval(() => {
      this.actualizarNoticiasAgricolas().catch((e) => this.logger.warn(`Ingesta periódica de noticias falló: ${e.message}`));
    }, 6 * 60 * 60 * 1000);
  }

  listar(filtros?: { region?: string; rubro?: string; tipo?: TipoNoticia }) {
    return this.prisma.noticiaFeed.findMany({
      where: {
        region: filtros?.region,
        rubro: filtros?.rubro,
        tipo: filtros?.tipo,
      },
      orderBy: [{ fechaPublicacion: 'desc' }],
      take: 60,
    });
  }

  crear(data: any) {
    return this.prisma.noticiaFeed.create({ data });
  }

  /** Lista de rubros disponibles, para poblar el filtro en la UI. */
  rubrosDisponibles() {
    return RUBROS_BUSQUEDA.map((r) => r.rubro);
  }

  /**
   * Trae noticias reales de Google News RSS (gratis, sin API key) para
   * cada rubro configurado, y las guarda (evitando duplicados por URL).
   * Se puede llamar manualmente desde la UI ("Actualizar noticias") además
   * de correr sola cada 6 horas.
   */
  async actualizarNoticiasAgricolas() {
    let totalNuevas = 0;

    for (const { rubro, consultas } of RUBROS_BUSQUEDA) {
      for (const consulta of consultas) {
        try {
          const items = await buscarNoticiasGoogleNews(consulta.query, consulta.idioma, consulta.region, 5);

          for (const item of items) {
            const existente = await this.prisma.noticiaFeed.findUnique({ where: { url: item.url } });
            if (existente) continue;

            await this.prisma.noticiaFeed.create({
              data: {
                tipo: TipoNoticia.PRECIOS_MERCADO,
                titulo: item.titulo,
                resumen: `Fuente: ${item.fuente}`,
                fuente: item.fuente,
                url: item.url,
                region: consulta.region === 'VE' ? 'Venezuela' : 'Internacional',
                rubro,
                relevancia: consulta.region === 'VE' ? 3 : 2,
                fechaPublicacion: item.fechaPublicacion,
              },
            });
            totalNuevas++;
          }
        } catch (e: any) {
          this.logger.warn(`Búsqueda "${consulta.query}" falló: ${e.message}`);
        }
      }
    }

    this.logger.log(`Ingesta de noticias: ${totalNuevas} nuevas.`);
    return { totalNuevas };
  }

  /** Clima actual de las zonas agrícolas de interés, en vivo (Open-Meteo). */
  async climaZonasAgricolas() {
    if (cacheClima && cacheClima.expira > Date.now()) {
      return cacheClima.data;
    }

    const resultados = await Promise.all(
      ZONAS_AGRICOLAS.map(async (zona) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${zona.lat}&longitude=${zona.lng}&current_weather=true&timezone=America%2FCaracas`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
          const json = await res.json();
          const actual = json.current_weather;

          return {
            zona: zona.nombre,
            estado: zona.estado,
            temperaturaC: actual?.temperature ?? null,
            vientoKmh: actual?.windspeed ?? null,
            condicion: DESCRIPCION_CODIGO_CLIMA[actual?.weathercode] ?? 'Sin dato',
            actualizado: actual?.time ?? null,
          };
        } catch {
          return { zona: zona.nombre, estado: zona.estado, temperaturaC: null, vientoKmh: null, condicion: 'No disponible', actualizado: null };
        }
      }),
    );

    cacheClima = { data: resultados, expira: Date.now() + TTL_CACHE_CLIMA_MS };
    return resultados;
  }

  /**
   * Precios actuales de commodities agrícolas (maíz, arroz, azúcar, soya,
   * trigo), vía la API pública de cotizaciones de Yahoo Finance — gratis,
   * sin API key. Es la misma referencia de precio internacional (CME/CBOT)
   * que se usa en mercados y noticias de commodities.
   */
  async preciosCommodities() {
    if (cacheCommodities && cacheCommodities.expira > Date.now()) {
      return cacheCommodities.data;
    }

    const resultados = await Promise.all(
      COMMODITIES.map(async (c) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(c.simbolo)}`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CADAgricolaBot/1.0)' } });
          if (!res.ok) throw new Error(`Yahoo Finance respondió ${res.status}`);
          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;

          const precioActual = meta?.regularMarketPrice ?? null;
          const precioCierreAnterior = meta?.previousClose ?? meta?.chartPreviousClose ?? null;
          const variacionPct = precioActual != null && precioCierreAnterior
            ? (precioActual - precioCierreAnterior) / precioCierreAnterior
            : null;

          // Convierte a USD/kg sin importar si cotiza en centavos, dólares,
          // bushels, cwt o libras — la variación % no cambia con la unidad,
          // así que se recicla la misma calculada arriba.
          const precioPorKg = precioActual != null
            ? (c.enCentavos ? precioActual / 100 : precioActual) / c.kgPorUnidad
            : null;

          return {
            nombre: c.nombre,
            unidadOriginal: c.unidadOriginal,
            precioOriginal: precioActual,
            precioPorKgUsd: precioPorKg,
            variacionPct,
            moneda: meta?.currency ?? 'USD',
          };
        } catch {
          return { nombre: c.nombre, unidadOriginal: c.unidadOriginal, precioOriginal: null, precioPorKgUsd: null, variacionPct: null, moneda: 'USD' };
        }
      }),
    );

    cacheCommodities = { data: resultados, expira: Date.now() + TTL_CACHE_COMMODITIES_MS };
    return resultados;
  }
}
