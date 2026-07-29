import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CrearInspeccionDto } from './dto';

/**
 * SEGUIMIENTO DE CAMPO
 *
 * Cálculo de población de plantas (el técnico solo cuenta plantas en 1 metro lineal):
 *
 *   metros lineales por ha = 10.000 m² ÷ distancia entre surcos (m)
 *   plantas objetivo       = m lineales/ha × densidad objetivo/m × área sembrada (ha)
 *   plantas estimadas      = m lineales/ha × conteo real/m      × área efectiva (ha)
 *   % logro                = estimadas ÷ objetivo
 *
 * Ejemplo: surcos a 0,45 m → 22.222 m lineales/ha. Con 12 plantas/m objetivo
 * y 10 ha sembradas → 2.666.640 plantas objetivo. Si el técnico cuenta 9
 * plantas/m sobre 9,5 ha efectivas → 1.900.000 estimadas ≈ 71% de logro.
 */
@Injectable()
export class FieldService {
  constructor(private prisma: PrismaService) {}

  calcularPoblacion(params: {
    distanciaSurcosM?: number | null;
    densidadObjetivoPlantasPorM?: number | null;
    plantasPorMetroLineal?: number | null;
    areaSembradaHa?: number | null;
    areaEfectivaHa?: number | null;
  }) {
    const { distanciaSurcosM, densidadObjetivoPlantasPorM, plantasPorMetroLineal } = params;

    // Sin distancia entre surcos no hay forma de extrapolar de metro lineal a hectárea.
    if (!distanciaSurcosM || distanciaSurcosM <= 0) {
      return { plantasObjetivoTotal: null, plantasEstimadasTotal: null, porcentajeLogroPoblacion: null };
    }

    const metrosLinealesPorHa = 10000 / distanciaSurcosM;
    const areaSembrada = params.areaSembradaHa ?? 0;
    const areaEfectiva = params.areaEfectivaHa ?? areaSembrada;

    const plantasObjetivoTotal = densidadObjetivoPlantasPorM
      ? Math.round(metrosLinealesPorHa * densidadObjetivoPlantasPorM * areaSembrada)
      : null;

    const plantasEstimadasTotal = plantasPorMetroLineal
      ? Math.round(metrosLinealesPorHa * plantasPorMetroLineal * areaEfectiva)
      : null;

    const porcentajeLogroPoblacion =
      plantasObjetivoTotal && plantasEstimadasTotal && plantasObjetivoTotal > 0
        ? plantasEstimadasTotal / plantasObjetivoTotal
        : null;

    return { plantasObjetivoTotal, plantasEstimadasTotal, porcentajeLogroPoblacion };
  }

  /** Registra una visita de campo, con sus incidencias, y calcula la población. */
  async crearInspeccion(cicloProductorId: string, dto: CrearInspeccionDto, tecnicoId: string) {
    const participacion = await this.prisma.cicloProductor.findUnique({
      where: { id: cicloProductorId },
      include: { lotes: true },
    });
    if (!participacion) throw new NotFoundException('Participación no encontrada.');

    // Si la visita es a un lote específico, se usan sus parámetros de siembra.
    let lote: (typeof participacion.lotes)[number] | null = null;
    if (dto.loteId) {
      lote = participacion.lotes.find((l) => l.id === dto.loteId) ?? null;
      if (!lote) {
        throw new BadRequestException('El lote indicado no pertenece a esta participación.');
      }
    }

    const areaSembradaHa = lote
      ? Number(lote.areaSembradaHa)
      : participacion.lotes.reduce((acc, l) => acc + Number(l.areaSembradaHa), 0);

    const poblacion = this.calcularPoblacion({
      distanciaSurcosM: lote?.distanciaSurcosM ? Number(lote.distanciaSurcosM) : null,
      densidadObjetivoPlantasPorM: lote?.densidadObjetivoPlantasPorM
        ? Number(lote.densidadObjetivoPlantasPorM) : null,
      plantasPorMetroLineal: dto.plantasPorMetroLineal ?? null,
      areaSembradaHa,
      areaEfectivaHa: dto.areaEfectivaHa ?? null,
    });

    return this.prisma.inspeccionCampo.create({
      data: {
        cicloProductorId,
        loteId: dto.loteId,
        fecha: new Date(dto.fecha),
        tecnicoId,
        areaEfectivaHa: dto.areaEfectivaHa,
        plantasPorMetroLineal: dto.plantasPorMetroLineal,
        plantasObjetivoTotal: poblacion.plantasObjetivoTotal,
        plantasEstimadasTotal: poblacion.plantasEstimadasTotal,
        porcentajeLogroPoblacion: poblacion.porcentajeLogroPoblacion,
        estadoFenologico: dto.estadoFenologico,
        usoAdecuadoInsumos: dto.usoAdecuadoInsumos,
        rendimientoProyectadoQqHa: dto.rendimientoProyectadoQqHa,
        observaciones: dto.observaciones,
        incidencias: dto.incidencias?.length
          ? { create: dto.incidencias.map((i) => ({ ...i })) }
          : undefined,
      },
      include: { incidencias: true, lote: { include: { parcela: true } } },
    });
  }

  listarInspecciones(cicloProductorId: string) {
    return this.prisma.inspeccionCampo.findMany({
      where: { cicloProductorId },
      include: {
        incidencias: true,
        tecnico: { select: { nombre: true } },
        lote: { include: { parcela: { select: { nombreLote: true } } } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  /**
   * Panel fitosanitario del ciclo: incidencias abiertas ordenadas por severidad.
   * Sirve para que el gerente vea de un vistazo dónde hay problemas serios
   * sin tener que abrir expediente por expediente.
   */
  async panelFitosanitario(cicloId: string) {
    const incidencias = await this.prisma.incidencia.findMany({
      where: { inspeccion: { cicloProductor: { cicloId } } },
      include: {
        inspeccion: {
          include: {
            cicloProductor: { include: { productor: { select: { nombre: true } } } },
            lote: { include: { parcela: { select: { nombreLote: true } } } },
          },
        },
      },
      orderBy: [{ severidad: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    const porTipo: Record<string, number> = {};
    let criticas = 0;

    const detalle = incidencias.map((i) => {
      porTipo[i.tipo] = (porTipo[i.tipo] ?? 0) + 1;
      if (i.severidad >= 4) criticas++;
      return {
        id: i.id,
        tipo: i.tipo,
        nombreComun: i.nombreComun,
        severidad: i.severidad,
        porcentajeAfectado: i.porcentajeAfectado ? Number(i.porcentajeAfectado) : null,
        accionRecomendada: i.accionRecomendada,
        aplicacionRealizada: i.aplicacionRealizada,
        productor: i.inspeccion.cicloProductor.productor.nombre,
        lote: i.inspeccion.lote?.parcela?.nombreLote ?? null,
        fecha: i.inspeccion.fecha,
      };
    });

    return { totalIncidencias: incidencias.length, criticas, porTipo, detalle };
  }
}
