import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CrearProductorDto, ActualizarProductorDto, CrearFincaDto } from './dto';

@Injectable()
export class ProducersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista para selector: el técnico ya no digita datos del productor,
   * solo lo elige de aquí al inscribirlo en un ciclo.
   */
  listar(soloActivos = true) {
    return this.prisma.productor.findMany({
      where: soloActivos ? { activo: true } : undefined,
      include: {
        fincas: { include: { _count: { select: { lotes: true } } } },
        _count: { select: { participaciones: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtener(id: string) {
    const productor = await this.prisma.productor.findUnique({
      where: { id },
      include: {
        fincas: { include: { lotes: true } },
        participaciones: {
          include: {
            ciclo: { select: { nombre: true, tipo: true, estado: true } },
            solicitud: { select: { estado: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!productor) throw new NotFoundException('Productor no encontrado.');
    return productor;
  }

  crear(dto: CrearProductorDto) {
    return this.prisma.productor.create({ data: dto });
  }

  async actualizar(id: string, dto: ActualizarProductorDto) {
    await this.obtener(id);
    return this.prisma.productor.update({ where: { id }, data: dto });
  }

  async crearFinca(productorId: string, dto: CrearFincaDto) {
    await this.obtener(productorId);
    return this.prisma.finca.create({ data: { ...dto, productorId } });
  }

  listarFincas(productorId: string) {
    return this.prisma.finca.findMany({
      where: { productorId },
      include: { lotes: true },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * DESEMPEÑO HISTÓRICO POR LOTE
   * Cada parcela física puede haberse sembrado en varios ciclos distintos
   * (Parcela persiste; LoteSiembra es la instancia por ciclo). Esto arma
   * el historial de cada lote: rendimiento real/proyectado, insumos usados
   * en ese ciclo, y en qué % de siembra logró — para ver qué le funcionó
   * mejor a ese lote y qué se hizo distinto entre un ciclo y otro.
   */
  async desempenoLotes(productorId: string) {
    await this.obtener(productorId);

    const lotesSiembra = await this.prisma.loteSiembra.findMany({
      where: { cicloProductor: { productorId } },
      include: {
        parcela: { select: { id: true, nombreLote: true } },
        cicloProductor: {
          include: {
            ciclo: { select: { id: true, nombre: true, cultivo: true, fechaInicio: true } },
            solicitud: { include: { itemsPaquete: true, liquidacion: true } },
          },
        },
        inspecciones: { orderBy: { fecha: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filas = lotesSiembra.map((l) => {
      const ultima = l.inspecciones[0] ?? null;
      const areaEfectivaHa = ultima?.areaEfectivaHa != null ? Number(ultima.areaEfectivaHa) : Number(l.areaSembradaHa);

      const liquidacion = l.cicloProductor.solicitud?.liquidacion ?? null;
      // La liquidación es por participación (puede cubrir varios lotes del mismo
      // productor), así que este rendimiento real es exacto cuando el productor
      // tiene un solo lote en el ciclo, y aproximado cuando tiene varios.
      const rendimientoRealQqHa = liquidacion?.produccionRealQq && areaEfectivaHa > 0
        ? Number(liquidacion.produccionRealQq) / areaEfectivaHa // aproximado si el productor tiene 1 solo lote
        : null;

      const rendimientoProyectadoQqHa = ultima?.rendimientoProyectadoQqHa != null
        ? Number(ultima.rendimientoProyectadoQqHa) : null;

      const insumos = l.cicloProductor.solicitud?.itemsPaquete.map((i) => ({
        nombreInsumo: i.nombreInsumo,
        categoria: i.categoria,
        cantidad: Number(i.cantidad),
        unidad: i.unidad,
        costoUnitario: Number(i.costoUnitario),
      })) ?? [];

      return {
        loteSiembraId: l.id,
        parcelaId: l.parcela.id,
        parcela: l.parcela.nombreLote,
        ciclo: l.cicloProductor.ciclo.nombre,
        cicloId: l.cicloProductor.ciclo.id,
        cultivo: l.cicloProductor.ciclo.cultivo,
        fechaInicio: l.cicloProductor.ciclo.fechaInicio,
        areaSembradaHa: Number(l.areaSembradaHa),
        areaEfectivaHa,
        porcentajeAreaEnPie: Number(l.areaSembradaHa) > 0 ? areaEfectivaHa / Number(l.areaSembradaHa) : null,
        rendimientoRealQqHa,
        rendimientoProyectadoQqHa,
        tieneLiquidacion: !!liquidacion,
        insumosUsados: insumos,
        costoInsumosHa: insumos.length > 0 && areaEfectivaHa > 0
          ? insumos.reduce((acc, i) => acc + i.cantidad * i.costoUnitario, 0) / areaEfectivaHa
          : null,
      };
    });

    // Ranking: primero por rendimiento real (si existe), luego por proyectado.
    const ranking = [...filas].sort((a, b) => {
      const va = a.rendimientoRealQqHa ?? a.rendimientoProyectadoQqHa ?? -1;
      const vb = b.rendimientoRealQqHa ?? b.rendimientoProyectadoQqHa ?? -1;
      return vb - va;
    });

    return { totalLotes: filas.length, ranking };
  }
}
