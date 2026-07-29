import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { parseKmlOrKmz, calcularCentroide, calcularAreaHectareas } from './kml-import.util';

@Injectable()
export class ParcelsService {
  constructor(private prisma: PrismaService) {}

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
}
