import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud, TipoDespacho, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  CrearSolicitudDto, DefinirPaqueteDto, AprobarSolicitudDto, RechazarSolicitudDto,
  CrearContratoDto, CrearDespachoDto, CrearLiquidacionDto,
} from './dto';

/**
 * EXPEDIENTE DE FINANCIAMIENTO — flujo real de CAD en 6 pasos.
 * Cuelga de una participación (CicloProductor): un productor dentro de un ciclo.
 *
 * Cobro = (Costo Insumos × (1 + margen 30%)) + (Anticipo × (1 + recargo 5%))
 *
 * Cada despacho y cada liquidación generan automáticamente un movimiento en el
 * estado de cuenta del productor, para que la cartera nunca dependa de que
 * alguien recuerde registrarlo aparte.
 */
@Injectable()
export class SolicitudesService {
  constructor(private prisma: PrismaService) {}

  listar(cicloId?: string) {
    return this.prisma.solicitudFinanciamiento.findMany({
      where: cicloId ? { cicloProductor: { cicloId } } : undefined,
      include: {
        cicloProductor: {
          include: { productor: true, ciclo: { select: { nombre: true, cultivo: true } } },
        },
        itemsPaquete: true,
        liquidacion: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(id: string) {
    const solicitud = await this.prisma.solicitudFinanciamiento.findUnique({
      where: { id },
      include: {
        cicloProductor: {
          include: {
            productor: true,
            ciclo: true,
            lotes: { include: { parcela: true } },
          },
        },
        itemsPaquete: true,
        contrato: true,
        despachos: { orderBy: { fecha: 'asc' } },
        liquidacion: true,
      },
    });
    if (!solicitud) throw new NotFoundException('Expediente de financiamiento no encontrado.');
    return solicitud;
  }

  // --- Paso 1: Evaluación y caracterización ---
  async crear(dto: CrearSolicitudDto, usuarioId: string) {
    const participacion = await this.prisma.cicloProductor.findUnique({
      where: { id: dto.cicloProductorId },
      include: { solicitud: true, lotes: true },
    });
    if (!participacion) throw new NotFoundException('Participación no encontrada.');
    if (participacion.solicitud) {
      throw new BadRequestException('Esta participación ya tiene un expediente abierto.');
    }
    if (participacion.lotes.length === 0) {
      throw new BadRequestException(
        'Agrega primero los lotes del productor (importados del KML) antes de abrir el financiamiento.',
      );
    }

    return this.prisma.solicitudFinanciamiento.create({
      data: {
        cicloProductorId: dto.cicloProductorId,
        areaVerificadaHa: dto.areaVerificadaHa,
        evaluacionTecnica: dto.evaluacionTecnica,
        evaluadoPorId: usuarioId,
        fechaEvaluacion: new Date(),
        estado: EstadoSolicitud.SOLICITUD_RECIBIDA,
      },
    });
  }

  // --- Paso 2: Paquete tecnológico + anticipo ---
  async definirPaquete(id: string, dto: DefinirPaqueteDto) {
    await this.obtener(id);

    await this.prisma.paqueteItem.deleteMany({ where: { solicitudId: id } });
    await this.prisma.paqueteItem.createMany({
      data: dto.items.map((item) => ({ ...item, solicitudId: id })),
    });

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: {
        margenInsumosPct: dto.margenInsumosPct ?? 0.30,
        solicitaAnticipo: dto.solicitaAnticipo ?? false,
        montoAnticipoSolicitado: dto.solicitaAnticipo ? dto.montoAnticipoSolicitado : null,
        recargoAnticipoPct: dto.recargoAnticipoPct ?? 0.05,
        estado: EstadoSolicitud.PAQUETE_DEFINIDO,
      },
      include: { itemsPaquete: true },
    });
  }

  // --- Paso 3a: Aprobación (Gerente) ---
  async aprobar(id: string, dto: AprobarSolicitudDto, usuarioId: string) {
    const solicitud = await this.obtener(id);
    if (solicitud.estado !== EstadoSolicitud.PAQUETE_DEFINIDO) {
      throw new BadRequestException('Solo se aprueba un expediente con paquete tecnológico definido.');
    }

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.APROBADA,
        montoAnticipoAprobado: dto.montoAnticipoAprobado ?? solicitud.montoAnticipoSolicitado,
        aprobadoPorId: usuarioId,
        fechaAprobacion: new Date(),
        notas: dto.notas,
      },
    });
  }

  async rechazar(id: string, dto: RechazarSolicitudDto, usuarioId: string) {
    await this.obtener(id);
    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.RECHAZADA,
        motivoRechazo: dto.motivoRechazo,
        aprobadoPorId: usuarioId,
        fechaAprobacion: new Date(),
      },
    });
  }

  // --- Paso 3b: Contrato ---
  async crearContrato(id: string, dto: CrearContratoDto) {
    const solicitud = await this.obtener(id);
    if (solicitud.estado !== EstadoSolicitud.APROBADA) {
      throw new BadRequestException('El expediente debe estar APROBADA antes de generar el contrato.');
    }

    await this.prisma.contrato.create({
      data: { ...dto, fechaFirma: new Date(dto.fechaFirma), solicitudId: id },
    });

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: { estado: EstadoSolicitud.CONTRATO_FIRMADO },
      include: { contrato: true },
    });
  }

  // --- Paso 4: Despacho / desembolso ---
  // Genera automáticamente el cargo en el estado de cuenta del productor,
  // ya con el margen o recargo aplicado (que es lo que realmente se le cobra).
  async crearDespacho(id: string, dto: CrearDespachoDto, usuarioId: string) {
    const solicitud = await this.obtener(id);
    const estadosValidos: EstadoSolicitud[] = [
      EstadoSolicitud.CONTRATO_FIRMADO, EstadoSolicitud.DESPACHADA, EstadoSolicitud.EN_SEGUIMIENTO,
    ];
    if (!estadosValidos.includes(solicitud.estado)) {
      throw new BadRequestException('El contrato debe estar firmado antes de despachar o girar anticipo.');
    }

    const esAnticipo = dto.tipo === TipoDespacho.ANTICIPO_EFECTIVO;
    const valorDespachado = esAnticipo ? (dto.montoEfectivo ?? 0) : (dto.valorDespachado ?? 0);

    if (valorDespachado <= 0) {
      throw new BadRequestException(
        esAnticipo ? 'Indica el monto del anticipo girado.' : 'Indica el valor de los insumos despachados.',
      );
    }

    const despacho = await this.prisma.despacho.create({
      data: {
        tipo: dto.tipo,
        fecha: new Date(dto.fecha),
        etapaCultivo: dto.etapaCultivo,
        montoEfectivo: dto.montoEfectivo,
        itemsDespachadosJson: dto.itemsDespachadosJson,
        valorDespachado,
        solicitudId: id,
        responsableId: usuarioId,
      },
    });

    // Lo que se le carga al productor incluye el margen/recargo desde el día 1.
    const factor = esAnticipo
      ? 1 + Number(solicitud.recargoAnticipoPct)
      : 1 + Number(solicitud.margenInsumosPct);

    await this.prisma.movimientoCuenta.create({
      data: {
        productorId: solicitud.cicloProductor.productorId,
        cicloProductorId: solicitud.cicloProductorId,
        tipo: esAnticipo ? TipoMovimiento.CARGO_ANTICIPO : TipoMovimiento.CARGO_INSUMOS,
        concepto: esAnticipo
          ? `Anticipo en efectivo (+${(Number(solicitud.recargoAnticipoPct) * 100).toFixed(0)}%)`
          : `Insumos despachados${dto.etapaCultivo ? ` — ${dto.etapaCultivo}` : ''} (+${(Number(solicitud.margenInsumosPct) * 100).toFixed(0)}%)`,
        fecha: new Date(dto.fecha),
        monto: valorDespachado * factor,
        referencia: despacho.id,
        registradoPorId: usuarioId,
      },
    });

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: { estado: EstadoSolicitud.DESPACHADA },
      include: { despachos: true },
    });
  }

  // --- Paso 6: Liquidación y recuperación ---
  async liquidar(id: string, dto: CrearLiquidacionDto, usuarioId: string) {
    const solicitud = await this.obtener(id);
    if (solicitud.liquidacion) {
      throw new BadRequestException('Este expediente ya fue liquidado.');
    }

    const costoInsumosBase = solicitud.itemsPaquete.reduce(
      (acc, item) => acc + Number(item.cantidad) * Number(item.costoUnitario), 0,
    );
    const montoInsumosConMargen = costoInsumosBase * (1 + Number(solicitud.margenInsumosPct));

    const montoAnticipoBase = Number(solicitud.montoAnticipoAprobado ?? 0);
    const montoAnticipoConRecargo = montoAnticipoBase * (1 + Number(solicitud.recargoAnticipoPct));

    const totalACobrar = montoInsumosConMargen + montoAnticipoConRecargo;
    const gananciaCAD =
      (montoInsumosConMargen - costoInsumosBase) + (montoAnticipoConRecargo - montoAnticipoBase);

    // Valor de la cosecha recibida: explícito, o calculado de producción × precio.
    const valorCosecha = dto.valorCosechaRecibida
      ?? (dto.produccionRealQq && dto.precioLiquidacionQq
        ? dto.produccionRealQq * dto.precioLiquidacionQq
        : null);

    const saldoPendiente = valorCosecha != null ? totalACobrar - valorCosecha : null;
    const estadoCobranza =
      saldoPendiente == null ? 'PENDIENTE'
      : saldoPendiente > 0 ? 'PARCIAL'
      : saldoPendiente < 0 ? 'A_FAVOR_PRODUCTOR'
      : 'COBRADO';

    await this.prisma.liquidacion.create({
      data: {
        solicitudId: id,
        fecha: new Date(dto.fecha),
        costoInsumosBase,
        montoInsumosConMargen,
        montoAnticipoBase,
        montoAnticipoConRecargo,
        totalACobrar,
        gananciaCAD,
        produccionRealQq: dto.produccionRealQq,
        precioLiquidacionQq: dto.precioLiquidacionQq,
        valorCosechaRecibida: valorCosecha ?? undefined,
        saldoPendiente: saldoPendiente ?? undefined,
        estadoCobranza,
        notas: dto.notas,
      },
    });

    // La cosecha entregada abona la deuda del productor.
    if (valorCosecha != null && valorCosecha > 0) {
      await this.prisma.movimientoCuenta.create({
        data: {
          productorId: solicitud.cicloProductor.productorId,
          cicloProductorId: solicitud.cicloProductorId,
          tipo: TipoMovimiento.ABONO_COSECHA,
          concepto: dto.produccionRealQq
            ? `Cosecha entregada: ${dto.produccionRealQq} qq`
            : 'Cosecha entregada',
          fecha: new Date(dto.fecha),
          monto: valorCosecha,
          referencia: `liquidacion:${id}`,
          registradoPorId: usuarioId,
        },
      });
    }

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: { estado: EstadoSolicitud.LIQUIDADA },
      include: { liquidacion: true },
    });
  }

  // --- Portafolio consolidado (Gerencia / Junta Directiva) ---
  async resumenPortafolio() {
    const solicitudes = await this.prisma.solicitudFinanciamiento.findMany({
      include: { itemsPaquete: true, liquidacion: true, despachos: true },
    });

    let expuestoTotal = 0;
    let desembolsadoTotal = 0;
    let gananciaEsperadaTotal = 0;
    let gananciaRealizada = 0;
    const porEstado: Record<string, number> = {};

    const CERRADOS: EstadoSolicitud[] = [
      EstadoSolicitud.LIQUIDADA, EstadoSolicitud.RECHAZADA, EstadoSolicitud.CANCELADA,
    ];

    for (const s of solicitudes) {
      porEstado[s.estado] = (porEstado[s.estado] ?? 0) + 1;

      const costoInsumos = s.itemsPaquete.reduce(
        (acc, i) => acc + Number(i.cantidad) * Number(i.costoUnitario), 0,
      );
      const anticipo = Number(s.montoAnticipoAprobado ?? s.montoAnticipoSolicitado ?? 0);

      if (!CERRADOS.includes(s.estado)) {
        expuestoTotal += costoInsumos + anticipo;
        gananciaEsperadaTotal +=
          costoInsumos * Number(s.margenInsumosPct) + anticipo * Number(s.recargoAnticipoPct);
        desembolsadoTotal += s.despachos.reduce((acc, d) => acc + Number(d.valorDespachado), 0);
      }

      if (s.liquidacion) gananciaRealizada += Number(s.liquidacion.gananciaCAD);
    }

    return {
      totalExpedientes: solicitudes.length,
      expuestoTotal,
      desembolsadoTotal,
      pendientePorDesembolsar: expuestoTotal - desembolsadoTotal,
      gananciaEsperadaTotal,
      gananciaRealizada,
      porEstado,
    };
  }
}
