import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { parseKmlOrKmz, calcularCentroide } from './kml-import.util';

@Injectable()
export class ParcelsService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.parcela.findMany({ include: { finca: { include: { productor: true } } } });
  }

  /**
   * Importa un .kml/.kmz de SIMA y crea una Parcela por cada polígono
   * encontrado, asociándolas a la finca indicada.
   */
  async importarKml(fincaId: string, file: Express.Multer.File, usuarioId: string) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo .kml o .kmz');

    const geoJson = parseKmlOrKmz(file.buffer, file.originalname);
    const poligonos = geoJson.features.filter((f) =>
      ['Polygon', 'MultiPolygon'].includes(f.geometry?.type),
    );

    if (poligonos.length === 0) {
      throw new BadRequestException('El archivo no contiene polígonos de lotes/parcelas.');
    }

    const creadas: Awaited<ReturnType<typeof this.prisma.parcela.create>>[] = [];
    for (const feature of poligonos) {
      const centroide = calcularCentroide(feature.geometry as any);
      const parcela = await this.prisma.parcela.create({
        data: {
          fincaId,
          nombreLote: feature.properties?.name ?? `Lote sin nombre (${creadas.length + 1})`,
          codigoSima: feature.properties?.codigo_sima ?? undefined,
          geoJson: feature.geometry as any,
          centroideLat: centroide?.lat,
          centroideLng: centroide?.lng,
          cargadaPorId: usuarioId,
        },
      });
      creadas.push(parcela);
    }

    return { totalImportado: creadas.length, parcelas: creadas };
  }
}
