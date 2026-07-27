import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  CrearSolicitudDto, DefinirPaqueteDto, AprobarSolicitudDto, RechazarSolicitudDto,
  CrearContratoDto, CrearDespachoDto, CrearInspeccionDto, CrearLiquidacionDto,
} from './dto';

/**
 * Implementa el flujo de 6 pasos tal como opera CAD hoy en campo.
 * Cada método corresponde a un paso del diagrama; el `estado` del expediente
 * (SolicitudFinanciamiento.estado) avanza solo cuando el paso se completa,
 * así que el estado siempre refleja en qué punto real del proceso está el productor.
 */
@Injectable()
export class SolicitudesService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.solicitudFinanciamiento.findMany({
      include: {
        ciclo: { include: { productor: true, parcela: true } },
        itemsPaquete: true,
        contrato: true,
        liquidacion: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(id: string) {
    const solicitud = await this.prisma.solicitudFinanciamiento.findUnique({
      where: { id },
      include: {
        ciclo: { include: { productor: true, parcela: true } },
        itemsPaquete: true,
        contrato: true,
        despachos: true,
        inspecciones: { include: { tecnico: { select: { nombre: true } } } },
        liquidacion: true,
      },
    });
    if (!solicitud) throw new NotFoundException('Expediente de financiamiento no encontrado.');
    return solicitud;
  }

  // --- Paso 1: Evaluación y caracterización ---
  async crear(dto: CrearSolicitudDto, usuarioId: string) {
    const existente = await this.prisma.solicitudFinanciamiento.findUnique({ where: { cicloId: dto.cicloId } });
    if (existente) throw new BadRequestException('Este ciclo ya tiene un expediente de financiamiento abierto.');

    return this.prisma.solicitudFinanciamiento.create({
      data: {
        cicloId: dto.cicloId,
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
      throw new BadRequestException('Solo se puede aprobar un expediente con paquete tecnológico definido.');
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
  async crearDespacho(id: string, dto: CrearDespachoDto, usuarioId: string) {
    const solicitud = await this.obtener(id);
    if (![EstadoSolicitud.CONTRATO_FIRMADO, EstadoSolicitud.DESPACHADA].includes(solicitud.estado)) {
      throw new BadRequestException('El contrato debe estar firmado antes de despachar insumos o girar el anticipo.');
    }

    await this.prisma.despacho.create({
      data: { ...dto, fecha: new Date(dto.fecha), solicitudId: id, responsableId: usuarioId },
    });

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: { estado: EstadoSolicitud.DESPACHADA },
      include: { despachos: true },
    });
  }

  // --- Paso 5: Seguimiento técnico ---
  async crearInspeccion(id: string, dto: CrearInspeccionDto, tecnicoId: string) {
    await this.obtener(id);

    await this.prisma.inspeccionCampo.create({
      data: { ...dto, fecha: new Date(dto.fecha), solicitudId: id, tecnicoId },
    });

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: { estado: EstadoSolicitud.EN_SEGUIMIENTO },
      include: { inspecciones: true },
    });
  }

  // --- Paso 6: Liquidación y recuperación ---
  // Cobro = (Costo Insumos x (1 + margenInsumos)) + (Anticipo x (1 + recargoAnticipo))
  async liquidar(id: string, dto: CrearLiquidacionDto) {
    const solicitud = await this.obtener(id);

    const costoInsumosBase = solicitud.itemsPaquete.reduce(
      (acc, item) => acc + Number(item.cantidad) * Number(item.costoUnitario),
      0,
    );
    const montoInsumosConMargen = costoInsumosBase * (1 + Number(solicitud.margenInsumosPct));

    const montoAnticipoBase = Number(solicitud.montoAnticipoAprobado ?? 0);
    const montoAnticipoConRecargo = montoAnticipoBase * (1 + Number(solicitud.recargoAnticipoPct));

    const totalACobrar = montoInsumosConMargen + montoAnticipoConRecargo;
    const gananciaCAD =
      (montoInsumosConMargen - costoInsumosBase) + (montoAnticipoConRecargo - montoAnticipoBase);

    const saldoPendiente = dto.valorCosechaRecibida != null ? totalACobrar - dto.valorCosechaRecibida : null;
    const estadoCobranza =
      saldoPendiente == null ? 'PENDIENTE' : saldoPendiente <= 0 ? 'COBRADO' : 'PARCIAL';

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
        valorCosechaRecibida: dto.valorCosechaRecibida,
        saldoPendiente: saldoPendiente ?? undefined,
        estadoCobranza,
        notas: dto.notas,
      },
    });

    return this.prisma.solicitudFinanciamiento.update({
      where: { id },
      data: { estado: EstadoSolicitud.LIQUIDADA },
      include: { liquidacion: true },
    });
  }

  // --- Dashboard de portafolio (Gerencia / Junta Directiva) ---
  async resumenPortafolio() {
    const solicitudes = await this.prisma.solicitudFinanciamiento.findMany({
      include: { itemsPaquete: true, liquidacion: true },
    });

    let expuestoTotal = 0;
    let gananciaEsperadaTotal = 0;
    let gananciaRealizada = 0;
    const porEstado: Record<string, number> = {};

    for (const s of solicitudes) {
      porEstado[s.estado] = (porEstado[s.estado] ?? 0) + 1;

      const costoInsumos = s.itemsPaquete.reduce(
        (acc, i) => acc + Number(i.cantidad) * Number(i.costoUnitario), 0,
      );
      const anticipo = Number(s.montoAnticipoAprobado ?? s.montoAnticipoSolicitado ?? 0);

      if (s.estado !== EstadoSolicitud.LIQUIDADA && s.estado !== EstadoSolicitud.RECHAZADA && s.estado !== EstadoSolicitud.CANCELADA) {
        expuestoTotal += costoInsumos + anticipo;
        gananciaEsperadaTotal += costoInsumos * Number(s.margenInsumosPct) + anticipo * Number(s.recargoAnticipoPct);
      }

      if (s.liquidacion) {
        gananciaRealizada += Number(s.liquidacion.gananciaCAD);
      }
    }

    return { expuestoTotal, gananciaEsperadaTotal, gananciaRealizada, porEstado, totalExpedientes: solicitudes.length };
  }
}
