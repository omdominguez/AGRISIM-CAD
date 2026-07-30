import { Injectable, BadRequestException, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { parseKmlOrKmz, calcularCentroide, calcularAreaHectareas } from './kml-import.util';

@Injectable()
export class ParcelsService implements OnModuleInit {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Corre al arrancar y luego cada 3 horas — suficiente para capturar el
    // acumulado del día sin golpear la API externa a cada rato. No bloquea
    // el arranque del servidor si falla.
    this.registrarLluviaAutomatica().catch((e) => this.logger.warn(`Ingesta de lluvia inicial falló: ${e.message}`));
    setInterval(() => {
      this.registrarLluviaAutomatica().catch((e) => this.logger.warn(`Ingesta de lluvia falló: ${e.message}`));
    }, 3 * 60 * 60 * 1000);
  }

  listar(fincaId?: string) {
    return this.prisma.parcela.findMany({
      where: fincaId ? { fincaId } : undefined,
      include: { finca: { include: { productor: true } } },
      orderBy: { nombreLote: 'asc' },
    });
  }

  /**
   * Data enriquecida para el mapa (estilo SIMA): por cada parcela, el ciclo
   * activo más reciente que se sembró ahí, la última visita del técnico,
   * y un semáforo propio calculado con lo que el sistema sí tiene —
   * no hay imágenes satelitales NDVI (eso es un servicio de terceros, tipo
   * Planet, que habría que contratar aparte); el semáforo aquí se basa en
   * área efectiva vs. sembrada, incidencias reportadas, y qué tan reciente
   * fue la última visita.
   */
  async listarParaMapa() {
    const parcelas = await this.prisma.parcela.findMany({
      include: {
        finca: { include: { productor: { select: { nombre: true } } } },
        lotesSiembra: {
          include: {
            cicloProductor: {
              include: {
                ciclo: { select: { nombre: true, cultivo: true, fechaInicio: true, estado: true } },
              },
            },
            inspecciones: {
              orderBy: { fecha: 'desc' },
              take: 1,
              include: { incidencias: true },
            },
          },
          orderBy: { fechaSiembra: 'desc' },
          take: 1, // el lote de siembra más reciente en esa parcela
        },
      },
    });

    return parcelas.map((p) => {
      const loteActivo = p.lotesSiembra[0] ?? null;
      const ultimaInspeccion = loteActivo?.inspecciones[0] ?? null;

      let semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_CICLO' = 'SIN_CICLO';
      let motivoSemaforo = 'Sin ciclo de siembra activo en esta parcela.';

      if (loteActivo) {
        const areaSembrada = Number(loteActivo.areaSembradaHa);
        const areaEfectiva = ultimaInspeccion?.areaEfectivaHa != null
          ? Number(ultimaInspeccion.areaEfectivaHa) : areaSembrada;
        const porcentajeEnPie = areaSembrada > 0 ? areaEfectiva / areaSembrada : 1;

        const incidenciaMaxima = ultimaInspeccion?.incidencias.reduce(
          (max, i) => Math.max(max, i.severidad), 0,
        ) ?? 0;

        const diasSinVisita = ultimaInspeccion
          ? Math.floor((Date.now() - new Date(ultimaInspeccion.fecha).getTime()) / 86400000)
          : null;

        if (porcentajeEnPie < 0.7 || incidenciaMaxima >= 4) {
          semaforo = 'ROJO';
          motivoSemaforo = incidenciaMaxima >= 4
            ? 'Incidencia fitosanitaria crítica reportada.'
            : `Solo ${(porcentajeEnPie * 100).toFixed(0)}% del área sembrada sigue en pie.`;
        } else if (porcentajeEnPie < 0.9 || incidenciaMaxima >= 2 || (diasSinVisita != null && diasSinVisita > 30)) {
          semaforo = 'AMARILLO';
          motivoSemaforo = diasSinVisita != null && diasSinVisita > 30
            ? `Sin visita de seguimiento hace ${diasSinVisita} días.`
            : 'Pérdida parcial o incidencia moderada detectada.';
        } else {
          semaforo = 'VERDE';
          motivoSemaforo = ultimaInspeccion ? 'Desarrollo normal según la última visita.' : 'Recién sembrado, sin novedades.';
        }
      }

      return {
        id: p.id,
        nombreLote: p.nombreLote,
        geoJson: p.geoJson,
        areaCalculadaHa: Number(p.areaCalculadaHa),
        centroideLat: p.centroideLat ? Number(p.centroideLat) : null,
        centroideLng: p.centroideLng ? Number(p.centroideLng) : null,
        finca: p.finca.nombre,
        productor: p.finca.productor.nombre,
        cicloActivo: loteActivo ? {
          nombre: loteActivo.cicloProductor.ciclo.nombre,
          cultivo: loteActivo.cicloProductor.ciclo.cultivo,
          fechaSiembra: loteActivo.fechaSiembra,
          diasDesdeSiembra: loteActivo.fechaSiembra
            ? Math.floor((Date.now() - new Date(loteActivo.fechaSiembra).getTime()) / 86400000)
            : null,
        } : null,
        ultimaVisita: ultimaInspeccion ? {
          fecha: ultimaInspeccion.fecha,
          estadoFenologico: ultimaInspeccion.estadoFenologico,
        } : null,
        semaforo,
        motivoSemaforo,
      };
    });
  }

  /**
   * Importa un .kml/.kmz de SIMA y crea una Parcela por cada polígono.
   * El área en hectáreas se calcula de la geometría — no se digita —
   * para que el sistema use la superficie exacta del lote mapeado.
   */
  async importarKml(fincaId: string, file: Express.Multer.File, usuarioId: string) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo .kml o .kmz');

    const finca = await this.prisma.finca.findUnique({ where: { id: fincaId } });
    if (!finca) throw new NotFoundException('La finca indicada no existe.');

    const geoJson = parseKmlOrKmz(file.buffer, file.originalname);
    const poligonos = geoJson.features.filter((f) =>
      ['Polygon', 'MultiPolygon'].includes(f.geometry?.type),
    );

    if (poligonos.length === 0) {
      throw new BadRequestException('El archivo no contiene polígonos de lotes/parcelas.');
    }

    const creadas: Awaited<ReturnType<typeof this.prisma.parcela.create>>[] = [];
    const omitidas: string[] = [];

    for (const feature of poligonos) {
      const areaHa = calcularAreaHectareas(feature.geometry as any);
      const nombreLote = feature.properties?.name ?? `Lote ${creadas.length + 1}`;

      // Un polígono degenerado (área ~0) suele ser un error de mapeo;
      // se omite y se reporta en vez de crear un lote inservible.
      if (areaHa <= 0.0001) {
        omitidas.push(nombreLote);
        continue;
      }

      const centroide = calcularCentroide(feature.geometry as any);

      const parcela = await this.prisma.parcela.create({
        data: {
          fincaId,
          nombreLote,
          codigoSima: feature.properties?.codigo_sima ?? undefined,
          geoJson: feature.geometry as any,
          areaCalculadaHa: Number(areaHa.toFixed(4)),
          centroideLat: centroide?.lat,
          centroideLng: centroide?.lng,
          cargadaPorId: usuarioId,
        },
      });
      creadas.push(parcela);
    }

    const areaTotalHa = creadas.reduce((acc, p) => acc + Number(p.areaCalculadaHa), 0);

    return {
      totalImportado: creadas.length,
      areaTotalHa: Number(areaTotalHa.toFixed(4)),
      lotesOmitidosPorAreaCero: omitidas,
      parcelas: creadas,
    };
  }

  /**
   * Crea una parcela a partir de un polígono dibujado a mano en el mapa
   * (en vez de importado de un KML). Mismo cálculo geodésico de área,
   * para que dibujar o importar den resultados consistentes.
   */
  async crearManual(fincaId: string, nombreLote: string, coordenadas: [number, number][], usuarioId: string) {
    const finca = await this.prisma.finca.findUnique({ where: { id: fincaId } });
    if (!finca) throw new NotFoundException('La finca indicada no existe.');

    if (coordenadas.length < 3) {
      throw new BadRequestException('Un lote necesita al menos 3 puntos para formar un polígono.');
    }

    // Cierra el anillo si el primer y último punto no coinciden (GeoJSON lo exige).
    const anillo = [...coordenadas];
    const [lngIni, latIni] = anillo[0];
    const [lngFin, latFin] = anillo[anillo.length - 1];
    if (lngIni !== lngFin || latIni !== latFin) anillo.push(anillo[0]);

    const geometry = { type: 'Polygon', coordinates: [anillo] };
    const areaHa = calcularAreaHectareas(geometry as any);

    if (areaHa <= 0.0001) {
      throw new BadRequestException('El polígono trazado no forma un área válida — revisa los puntos.');
    }

    const centroide = calcularCentroide(geometry as any);

    return this.prisma.parcela.create({
      data: {
        fincaId,
        nombreLote,
        geoJson: geometry as any,
        areaCalculadaHa: Number(areaHa.toFixed(4)),
        centroideLat: centroide?.lat,
        centroideLng: centroide?.lng,
        cargadaPorId: usuarioId,
      },
    });
  }

  // ==========================================================================
  // LLUVIA POR PARCELA — mm reales, no solo la imagen del radar.
  // Open-Meteo (gratis, sin key) da precipitación numérica por coordenada;
  // se consulta TODAS las parcelas en una sola llamada (coordenadas separadas
  // por coma) para no hacer una petición por lote.
  // ==========================================================================

  private async consultarLluviaOpenMeteo(parcelas: { id: string; lat: number; lng: number }[]) {
    if (parcelas.length === 0) return new Map<string, { mmUltimaHora: number; mmAcumuladoHoy: number }>();

    const lats = parcelas.map((p) => p.lat).join(',');
    const lngs = parcelas.map((p) => p.lng).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation&hourly=precipitation&timezone=America%2FCaracas&forecast_days=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
    const json = await res.json();
    // Con una sola coordenada, Open-Meteo devuelve un objeto; con varias, un arreglo.
    const resultados: any[] = Array.isArray(json) ? json : [json];

    const mapa = new Map<string, { mmUltimaHora: number; mmAcumuladoHoy: number }>();
    resultados.forEach((r, i) => {
      const parcela = parcelas[i];
      const mmUltimaHora = Number(r?.current?.precipitation ?? 0);

      // Acumulado del día: suma las horas de hoy hasta la hora actual.
      const horas: string[] = r?.hourly?.time ?? [];
      const valores: number[] = r?.hourly?.precipitation ?? [];
      const horaActual = r?.current?.time ?? new Date().toISOString();
      const mmAcumuladoHoy = horas.reduce((acc, hora, idx) => {
        if (hora.slice(0, 10) === horaActual.slice(0, 10) && hora <= horaActual) {
          return acc + (valores[idx] ?? 0);
        }
        return acc;
      }, 0);

      mapa.set(parcela.id, { mmUltimaHora, mmAcumuladoHoy: Number(mmAcumuladoHoy.toFixed(1)) });
    });

    return mapa;
  }

  /** Alertas en vivo — para el widget del dashboard y del mapa. No persiste nada. */
  async alertasLluvia() {
    const parcelas = await this.prisma.parcela.findMany({
      where: { centroideLat: { not: null }, centroideLng: { not: null } },
      include: { finca: { include: { productor: { select: { nombre: true } } } } },
    });

    const coords = parcelas.map((p) => ({
      id: p.id, lat: Number(p.centroideLat), lng: Number(p.centroideLng),
    }));

    const lluvia = await this.consultarLluviaOpenMeteo(coords);

    const conAlerta = parcelas
      .map((p) => {
        const datos = lluvia.get(p.id);
        return {
          parcelaId: p.id,
          nombreLote: p.nombreLote,
          finca: p.finca.nombre,
          productor: p.finca.productor.nombre,
          mmUltimaHora: datos?.mmUltimaHora ?? 0,
          mmAcumuladoHoy: datos?.mmAcumuladoHoy ?? 0,
          lloviendoAhora: (datos?.mmUltimaHora ?? 0) > 0,
        };
      })
      .filter((p) => p.lloviendoAhora || p.mmAcumuladoHoy > 0)
      .sort((a, b) => b.mmAcumuladoHoy - a.mmAcumuladoHoy);

    return { totalConLluvia: conAlerta.length, parcelas: conAlerta };
  }

  /**
   * Corre sola (al arrancar y cada 3h): guarda el acumulado del día por
   * parcela en RegistroLluvia. Así queda un histórico real, no solo la
   * foto del momento — con esto se puede comparar lluvia vs. rendimiento
   * más adelante.
   */
  async registrarLluviaAutomatica() {
    const parcelas = await this.prisma.parcela.findMany({
      where: { centroideLat: { not: null }, centroideLng: { not: null } },
      select: { id: true, centroideLat: true, centroideLng: true },
    });

    const coords = parcelas.map((p) => ({ id: p.id, lat: Number(p.centroideLat), lng: Number(p.centroideLng) }));
    const lluvia = await this.consultarLluviaOpenMeteo(coords);

    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    let actualizados = 0;
    for (const [parcelaId, datos] of lluvia.entries()) {
      await this.prisma.registroLluvia.upsert({
        where: { parcelaId_fecha: { parcelaId, fecha: hoy } },
        update: { mmEstimado: datos.mmAcumuladoHoy },
        create: { parcelaId, fecha: hoy, mmEstimado: datos.mmAcumuladoHoy },
      });
      actualizados++;
    }

    this.logger.log(`Registro de lluvia automático: ${actualizados} parcelas actualizadas.`);
    return { actualizados };
  }

  /** El técnico digita lo que midió en su pluviómetro — manda sobre el estimado. */
  async registrarLluviaManual(parcelaId: string, fecha: string, mmMedido: number, usuarioId: string) {
    const parcela = await this.prisma.parcela.findUnique({ where: { id: parcelaId } });
    if (!parcela) throw new NotFoundException('Parcela no encontrada.');

    const fechaDia = new Date(fecha);
    fechaDia.setUTCHours(0, 0, 0, 0);

    return this.prisma.registroLluvia.upsert({
      where: { parcelaId_fecha: { parcelaId, fecha: fechaDia } },
      update: { mmMedido, registradoPorId: usuarioId },
      create: { parcelaId, fecha: fechaDia, mmMedido, registradoPorId: usuarioId },
    });
  }

  /** Histórico de lluvia de una parcela — para ver la tendencia en el tiempo. */
  historialLluvia(parcelaId: string) {
    return this.prisma.registroLluvia.findMany({
      where: { parcelaId },
      orderBy: { fecha: 'desc' },
      take: 60,
    });
  }

  /**
   * Corrige el polígono de una parcela ya creada — mismo cálculo de área
   * que al crearla, así que da igual si el lote nació por KML, dibujo, o
   * ahora se está ajustando: el área siempre sale de la geometría real.
   */
  async actualizarGeometria(parcelaId: string, nombreLote?: string, coordenadas?: [number, number][]) {
    const parcela = await this.prisma.parcela.findUnique({ where: { id: parcelaId } });
    if (!parcela) throw new NotFoundException('Parcela no encontrada.');

    const data: any = {};
    if (nombreLote) data.nombreLote = nombreLote;

    if (coordenadas) {
      if (coordenadas.length < 3) {
        throw new BadRequestException('Un lote necesita al menos 3 puntos para formar un polígono.');
      }
      const anillo = [...coordenadas];
      const [lngIni, latIni] = anillo[0];
      const [lngFin, latFin] = anillo[anillo.length - 1];
      if (lngIni !== lngFin || latIni !== latFin) anillo.push(anillo[0]);

      const geometry = { type: 'Polygon', coordinates: [anillo] };
      const areaHa = calcularAreaHectareas(geometry as any);
      if (areaHa <= 0.0001) {
        throw new BadRequestException('El polígono trazado no forma un área válida — revisa los puntos.');
      }
      const centroide = calcularCentroide(geometry as any);

      data.geoJson = geometry;
      data.areaCalculadaHa = Number(areaHa.toFixed(4));
      data.centroideLat = centroide?.lat;
      data.centroideLng = centroide?.lng;
    }

    return this.prisma.parcela.update({ where: { id: parcelaId }, data });
  }

  /**
   * Borra un lote. Si ya está usado en un ciclo (tiene un LoteSiembra
   * asociado), se bloquea con un mensaje claro en vez de dejar que la base
   * de datos lo rechace con un error críptico de llave foránea.
   */
  async eliminar(parcelaId: string) {
    const parcela = await this.prisma.parcela.findUnique({
      where: { id: parcelaId },
      include: { lotesSiembra: true },
    });
    if (!parcela) throw new NotFoundException('Parcela no encontrada.');

    if (parcela.lotesSiembra.length > 0) {
      throw new BadRequestException(
        'Este lote ya está siendo usado en uno o más ciclos de siembra — no se puede borrar mientras esté en uso.',
      );
    }

    await this.prisma.parcela.delete({ where: { id: parcelaId } });
    return { eliminado: true };
  }
}
