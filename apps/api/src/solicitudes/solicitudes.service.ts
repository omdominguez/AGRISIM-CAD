import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud, TipoDespacho } from '@prisma/client';
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
    const estadosValidos: EstadoSolicitud[] = [EstadoSolicitud.CONTRATO_FIRMADO, EstadoSolicitud.DESPACHADA];
    if (!estadosValidos.includes(solicitud.estado)) {
      throw new BadRequestException('El contrato debe estar firmado antes de despachar insumos o girar el anticipo.');
    }

    // El valor real del despacho es la base de "gastado a la fecha" en Resumen de Ciclo:
    // para anticipo en efectivo es el monto girado; para insumos, quien despacha confirma
    // el valor de lo que efectivamente salió (puede ser parcial respecto al paquete completo).
    const valorDespachado =
      dto.tipo === TipoDespacho.ANTICIPO_EFECTIVO ? (dto.montoEfectivo ?? 0) : (dto.valorDespachado ?? 0);

    if (valorDespachado <= 0) {
      throw new BadRequestException(
        dto.tipo === TipoDespacho.ANTICIPO_EFECTIVO
          ? 'Debes indicar el monto del anticipo girado.'
          : 'Debes indicar el valor de los insumos despachados.',
      );
    }

    await this.prisma.despacho.create({
      data: { ...dto, fecha: new Date(dto.fecha), solicitudId: id, responsableId: usuarioId, valorDespachado },
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

  // --- Resumen de Ciclo (uso diario: técnicos, gerencia) ---
  // Por cada ciclo con expediente en curso: cuánto se sembró, cuánto sigue
  // efectivamente en pie (última visita del técnico), cuánto se ha
  // desembolsado a la fecha, y la proyección de cosecha más reciente.
  // Solo cuenta como "en curso" lo que ya salió de PLANIFICADO — antes de
  // aprobación no hay nada que monitorear en campo todavía.
  async resumenCiclos() {
    const ESTADOS_EN_CURSO: EstadoSolicitud[] = [
      EstadoSolicitud.APROBADA,
      EstadoSolicitud.CONTRATO_FIRMADO,
      EstadoSolicitud.DESPACHADA,
      EstadoSolicitud.EN_SEGUIMIENTO,
      EstadoSolicitud.COSECHADA,
    ];

    const solicitudes = await this.prisma.solicitudFinanciamiento.findMany({
      where: { estado: { in: ESTADOS_EN_CURSO } },
      include: {
        ciclo: { include: { productor: true, parcela: { include: { finca: true } } } },
        itemsPaquete: true,
        despachos: true,
        inspecciones: { orderBy: { fecha: 'desc' }, take: 1, include: { tecnico: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return solicitudes.map((s) => {
      const ultimaInspeccion = s.inspecciones[0] ?? null;

      const areaSembradaHa = Number(s.ciclo.areaHectareas);
      const areaEfectivaHa = ultimaInspeccion?.areaEfectivaHa != null
        ? Number(ultimaInspeccion.areaEfectivaHa)
        : areaSembradaHa; // sin visitas todavía: se asume igual a lo sembrado

      const costoInsumosBase = s.itemsPaquete.reduce(
        (acc, i) => acc + Number(i.cantidad) * Number(i.costoUnitario), 0,
      );
      const anticipoAprobado = Number(s.montoAnticipoAprobado ?? 0);
      const montoTotalAFinanciar = costoInsumosBase + anticipoAprobado;

      const gastadoAFecha = s.despachos.reduce((acc, d) => acc + Number(d.valorDespachado), 0);

      const rendimientoProyectadoQqHa = ultimaInspeccion?.rendimientoProyectadoQqHa != null
        ? Number(ultimaInspeccion.rendimientoProyectadoQqHa)
        : (s.ciclo.rendimientoEsperadoQqHa != null ? Number(s.ciclo.rendimientoEsperadoQqHa) : null);

      const proyeccionCosechaQq = rendimientoProyectadoQqHa != null ? rendimientoProyectadoQqHa * areaEfectivaHa : null;

      return {
        solicitudId: s.id,
        estado: s.estado,
        productor: s.ciclo.productor.nombre,
        finca: s.ciclo.parcela?.finca?.nombre ?? null,
        cultivo: s.ciclo.cultivo,
        areaSembradaHa,
        areaEfectivaHa,
        porcentajeAreaEnPie: areaSembradaHa > 0 ? areaEfectivaHa / areaSembradaHa : null,
        montoTotalAFinanciar,
        gastadoAFecha,
        porcentajeDesembolsado: montoTotalAFinanciar > 0 ? gastadoAFecha / montoTotalAFinanciar : null,
        rendimientoProyectadoQqHa,
        proyeccionCosechaQq,
        ultimaVisita: ultimaInspeccion
          ? { fecha: ultimaInspeccion.fecha, tecnico: ultimaInspeccion.tecnico.nombre, estadoCultivo: ultimaInspeccion.estadoCultivo }
          : null,
      };
    });
  }
}
