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
}
