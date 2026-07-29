import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CrearCicloDto, ActualizarCicloDto, InscribirProductorDto, AgregarLoteDto,
} from './dto';

/**
 * CICLO-CAMPAÑA
 * Flujo de carga del técnico:
 *   1. Crear ciclo (tipo, fecha inicio, meta de productores y hectáreas)
 *   2. Inscribir productores (se seleccionan de la lista, ya existen en el sistema)
 *   3. Agregar los lotes de cada productor — el área sale del KML, no se digita
 */
@Injectable()
export class CyclesService {
  constructor(private prisma: PrismaService) {}

  // ---------- Ciclo ----------

  async crear(dto: CrearCicloDto, usuarioId: string) {
    return this.prisma.ciclo.create({
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        cultivo: dto.cultivo,
        fechaInicio: new Date(dto.fechaInicio),
        fechaCierreEst: dto.fechaCierreEst ? new Date(dto.fechaCierreEst) : undefined,
        metaProductores: dto.metaProductores,
        metaHectareas: dto.metaHectareas,
        precioReferenciaQq: dto.precioReferenciaQq,
        creadoPorId: usuarioId,
      },
    });
  }

  listar() {
    return this.prisma.ciclo.findMany({
      include: { _count: { select: { participaciones: true } } },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async obtener(id: string) {
    const ciclo = await this.prisma.ciclo.findUnique({
      where: { id },
      include: {
        participaciones: {
          include: {
            productor: true,
            lotes: { include: { parcela: true } },
            solicitud: { select: { id: true, estado: true } },
            tecnicoResponsable: { select: { nombre: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado.');
    return ciclo;
  }

  async actualizar(id: string, dto: ActualizarCicloDto) {
    await this.obtener(id);
    return this.prisma.ciclo.update({
      where: { id },
      data: {
        ...dto,
        fechaCierreEst: dto.fechaCierreEst ? new Date(dto.fechaCierreEst) : undefined,
      },
    });
  }

  // ---------- Participaciones ----------

  async inscribirProductor(cicloId: string, dto: InscribirProductorDto) {
    const ciclo = await this.prisma.ciclo.findUnique({ where: { id: cicloId } });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado.');

    const productor = await this.prisma.productor.findUnique({ where: { id: dto.productorId } });
    if (!productor) throw new NotFoundException('Productor no encontrado.');
    if (!productor.activo) throw new BadRequestException('El productor está inactivo.');

    const yaInscrito = await this.prisma.cicloProductor.findUnique({
      where: { cicloId_productorId: { cicloId, productorId: dto.productorId } },
    });
    if (yaInscrito) {
      throw new BadRequestException('Este productor ya está inscrito en el ciclo.');
    }

    return this.prisma.cicloProductor.create({
      data: {
        cicloId,
        productorId: dto.productorId,
        hectareasComprometidas: dto.hectareasComprometidas,
        tecnicoResponsableId: dto.tecnicoResponsableId,
      },
      include: { productor: true },
    });
  }

  async obtenerParticipacion(id: string) {
    const participacion = await this.prisma.cicloProductor.findUnique({
      where: { id },
      include: {
        ciclo: true,
        productor: true,
        lotes: { include: { parcela: { include: { finca: true } } } },
        solicitud: { include: { itemsPaquete: true, despachos: true, liquidacion: true } },
        inspecciones: {
          include: { incidencias: true, tecnico: { select: { nombre: true } } },
          orderBy: { fecha: 'desc' },
        },
      },
    });
    if (!participacion) throw new NotFoundException('Participación no encontrada.');
    return participacion;
  }

  // ---------- Lotes de siembra ----------

  /**
   * Agrega un lote a la participación. El área se toma de la parcela
   * (calculada del KML), garantizando que la hectárea registrada sea
   * la del mapeo real y no un número digitado.
   */
  async agregarLote(cicloProductorId: string, dto: AgregarLoteDto) {
    const participacion = await this.prisma.cicloProductor.findUnique({
      where: { id: cicloProductorId },
      include: { productor: true },
    });
    if (!participacion) throw new NotFoundException('Participación no encontrada.');

    const parcela = await this.prisma.parcela.findUnique({
      where: { id: dto.parcelaId },
      include: { finca: true },
    });
    if (!parcela) throw new NotFoundException('Parcela no encontrada. Impórtala primero desde el KML de SIMA.');

    // La parcela debe pertenecer a una finca del mismo productor.
    if (parcela.finca.productorId !== participacion.productorId) {
      throw new BadRequestException(
        `La parcela "${parcela.nombreLote}" pertenece a otro productor. Verifica el mapeo de SIMA.`,
      );
    }

    const duplicado = await this.prisma.loteSiembra.findUnique({
      where: { cicloProductorId_parcelaId: { cicloProductorId, parcelaId: dto.parcelaId } },
    });
    if (duplicado) throw new BadRequestException('Ese lote ya fue agregado a esta participación.');

    return this.prisma.loteSiembra.create({
      data: {
        cicloProductorId,
        parcelaId: dto.parcelaId,
        areaSembradaHa: parcela.areaCalculadaHa, // ← del KML, no digitada
        fechaSiembra: dto.fechaSiembra ? new Date(dto.fechaSiembra) : undefined,
        distanciaSurcosM: dto.distanciaSurcosM,
        densidadObjetivoPlantasPorM: dto.densidadObjetivoPlantasPorM,
      },
      include: { parcela: true },
    });
  }

  async eliminarLote(loteId: string) {
    const lote = await this.prisma.loteSiembra.findUnique({
      where: { id: loteId },
      include: { inspecciones: true },
    });
    if (!lote) throw new NotFoundException('Lote no encontrado.');
    if (lote.inspecciones.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar un lote con inspecciones registradas. Anula las inspecciones primero.',
      );
    }
    return this.prisma.loteSiembra.delete({ where: { id: loteId } });
  }

  // ---------- Resumen del ciclo: meta vs. real ----------

  /**
   * Compara lo planificado contra lo que efectivamente ocurrió en campo:
   * productores inscritos vs. meta, hectáreas comprometidas vs. sembradas
   * (según KML) vs. efectivas (según última inspección del técnico).
   */
  async resumen(cicloId: string) {
    const ciclo = await this.prisma.ciclo.findUnique({
      where: { id: cicloId },
      include: {
        participaciones: {
          include: {
            productor: { select: { id: true, nombre: true } },
            lotes: true,
            solicitud: {
              include: { itemsPaquete: true, despachos: true, liquidacion: true },
            },
            inspecciones: { orderBy: { fecha: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado.');

    let hectareasComprometidas = 0;
    let hectareasSembradas = 0;
    let hectareasEfectivas = 0;
    let financiadoTotal = 0;
    let desembolsadoTotal = 0;
    let produccionProyectadaQq = 0;

    const detalleProductores = ciclo.participaciones.map((p) => {
      const haComprometidas = Number(p.hectareasComprometidas);
      const haSembradas = p.lotes.reduce((acc, l) => acc + Number(l.areaSembradaHa), 0);

      const ultima = p.inspecciones[0] ?? null;
      const haEfectivas = ultima?.areaEfectivaHa != null ? Number(ultima.areaEfectivaHa) : haSembradas;

      const costoInsumos = p.solicitud
        ? p.solicitud.itemsPaquete.reduce((acc, i) => acc + Number(i.cantidad) * Number(i.costoUnitario), 0)
        : 0;
      const anticipo = Number(p.solicitud?.montoAnticipoAprobado ?? 0);
      const financiado = costoInsumos + anticipo;
      const desembolsado = p.solicitud
        ? p.solicitud.despachos.reduce((acc, d) => acc + Number(d.valorDespachado), 0)
        : 0;

      const rendProyectado = ultima?.rendimientoProyectadoQqHa != null
        ? Number(ultima.rendimientoProyectadoQqHa)
        : null;
      const produccionQq = rendProyectado != null ? rendProyectado * haEfectivas : 0;

      hectareasComprometidas += haComprometidas;
      hectareasSembradas += haSembradas;
      hectareasEfectivas += haEfectivas;
      financiadoTotal += financiado;
      desembolsadoTotal += desembolsado;
      produccionProyectadaQq += produccionQq;

      return {
        cicloProductorId: p.id,
        productor: p.productor.nombre,
        estadoSolicitud: p.solicitud?.estado ?? null,
        cantidadLotes: p.lotes.length,
        haComprometidas,
        haSembradas,
        haEfectivas,
        financiado,
        desembolsado,
        rendimientoProyectadoQqHa: rendProyectado,
        produccionProyectadaQq: produccionQq,
        ultimaVisita: ultima?.fecha ?? null,
      };
    });

    return {
      ciclo: {
        id: ciclo.id,
        nombre: ciclo.nombre,
        tipo: ciclo.tipo,
        estado: ciclo.estado,
        cultivo: ciclo.cultivo,
        fechaInicio: ciclo.fechaInicio,
        precioReferenciaQq: ciclo.precioReferenciaQq ? Number(ciclo.precioReferenciaQq) : null,
      },
      metas: {
        productores: ciclo.metaProductores,
        hectareas: Number(ciclo.metaHectareas),
      },
      real: {
        productoresInscritos: ciclo.participaciones.length,
        hectareasComprometidas,
        hectareasSembradas,   // suma de lotes, área KML
        hectareasEfectivas,   // según última inspección
      },
      avance: {
        productoresPct: ciclo.metaProductores > 0
          ? ciclo.participaciones.length / ciclo.metaProductores : null,
        hectareasPct: Number(ciclo.metaHectareas) > 0
          ? hectareasSembradas / Number(ciclo.metaHectareas) : null,
      },
      financiero: {
        financiadoTotal,
        desembolsadoTotal,
        pendientePorDesembolsar: financiadoTotal - desembolsadoTotal,
      },
      produccionProyectadaQq,
      detalleProductores,
    };
  }
}
