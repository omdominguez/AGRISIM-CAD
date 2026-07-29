import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { CrearMovimientoDto } from './dto';

/**
 * ESTADO DE CUENTA DEL PRODUCTOR
 *
 * Convención de signos (el monto guardado siempre es positivo; el tipo decide):
 *   CARGO_INSUMOS / CARGO_ANTICIPO / CARGO_OTRO  →  suma  (el productor debe más)
 *   ABONO_COSECHA / ABONO_PAGO                   →  resta (el productor debe menos)
 *   PAGO_A_PRODUCTOR                             →  suma  (CAD le pagó el excedente,
 *                                                          lo que salda el saldo a favor)
 *
 * Saldo > 0  →  el productor le debe a CAD
 * Saldo < 0  →  CAD le debe al productor (excedente de cosecha por pagar)
 */
const TIPOS_CARGO: TipoMovimiento[] = [
  TipoMovimiento.CARGO_INSUMOS,
  TipoMovimiento.CARGO_ANTICIPO,
  TipoMovimiento.CARGO_OTRO,
  TipoMovimiento.PAGO_A_PRODUCTOR,
];

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  private signo(tipo: TipoMovimiento): 1 | -1 {
    return TIPOS_CARGO.includes(tipo) ? 1 : -1;
  }

  async crearMovimiento(dto: CrearMovimientoDto, usuarioId: string) {
    return this.prisma.movimientoCuenta.create({
      data: {
        productorId: dto.productorId,
        cicloProductorId: dto.cicloProductorId,
        tipo: dto.tipo,
        concepto: dto.concepto,
        fecha: new Date(dto.fecha),
        monto: dto.monto,
        referencia: dto.referencia,
        registradoPorId: usuarioId,
      },
    });
  }

  /**
   * Estado de cuenta de un productor, con saldo corrido movimiento a movimiento
   * para que se pueda auditar cómo se llegó al saldo final.
   */
  async estadoDeCuenta(productorId: string) {
    const productor = await this.prisma.productor.findUnique({ where: { id: productorId } });
    if (!productor) throw new NotFoundException('Productor no encontrado.');

    const movimientos = await this.prisma.movimientoCuenta.findMany({
      where: { productorId },
      include: { cicloProductor: { include: { ciclo: { select: { nombre: true } } } } },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    });

    let saldoCorrido = 0;
    let totalCargos = 0;
    let totalAbonos = 0;

    const detalle = movimientos.map((m) => {
      const monto = Number(m.monto);
      const signo = this.signo(m.tipo);
      saldoCorrido += monto * signo;
      if (signo === 1) totalCargos += monto;
      else totalAbonos += monto;

      return {
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        concepto: m.concepto,
        referencia: m.referencia,
        ciclo: m.cicloProductor?.ciclo?.nombre ?? null,
        cargo: signo === 1 ? monto : null,
        abono: signo === -1 ? monto : null,
        saldoCorrido,
      };
    });

    return {
      productor: { id: productor.id, nombre: productor.nombre, cedulaRif: productor.cedulaRif },
      totalCargos,
      totalAbonos,
      saldoFinal: saldoCorrido,
      // Interpretación explícita para que la UI no tenga que adivinar el signo.
      situacion:
        saldoCorrido > 0 ? 'PRODUCTOR_DEBE_A_CAD'
        : saldoCorrido < 0 ? 'CAD_DEBE_A_PRODUCTOR'
        : 'SALDADO',
      movimientos: detalle,
    };
  }

  /** Cartera completa: saldo de todos los productores, ordenado por exposición. */
  async cartera() {
    const movimientos = await this.prisma.movimientoCuenta.findMany({
      include: { productor: { select: { id: true, nombre: true } } },
    });

    const porProductor = new Map<string, { nombre: string; saldo: number }>();

    for (const m of movimientos) {
      const actual = porProductor.get(m.productorId) ?? { nombre: m.productor.nombre, saldo: 0 };
      actual.saldo += Number(m.monto) * this.signo(m.tipo);
      porProductor.set(m.productorId, actual);
    }

    const detalle = [...porProductor.entries()]
      .map(([productorId, v]) => ({ productorId, nombre: v.nombre, saldo: v.saldo }))
      .sort((a, b) => b.saldo - a.saldo);

    return {
      porCobrar: detalle.filter((d) => d.saldo > 0).reduce((acc, d) => acc + d.saldo, 0),
      porPagar: Math.abs(detalle.filter((d) => d.saldo < 0).reduce((acc, d) => acc + d.saldo, 0)),
      detalle,
    };
  }

  /**
   * PROYECCIÓN DE EFECTIVO PARA LA COSECHA
   *
   * Responde: "¿cuánto efectivo necesito tener disponible cuando llegue la cosecha
   * para pagarle a los productores?"
   *
   * Por cada productor del ciclo:
   *   valor cosecha esperada = producción proyectada (qq) × precio por qq
   *   deuda actual           = saldo del estado de cuenta
   *   si valor cosecha > deuda → CAD debe pagarle la diferencia en efectivo
   *   si valor cosecha < deuda → queda saldo pendiente por cobrar (riesgo de mora)
   *
   * La producción proyectada viene de la última inspección del técnico
   * (rendimiento qq/ha × área efectiva), así que la proyección mejora
   * en precisión a medida que avanzan las visitas de campo.
   */
  async proyeccionEfectivoCosecha(cicloId: string, precioOverride?: number) {
    const ciclo = await this.prisma.ciclo.findUnique({
      where: { id: cicloId },
      include: {
        participaciones: {
          include: {
            productor: { select: { id: true, nombre: true } },
            lotes: true,
            inspecciones: { orderBy: { fecha: 'desc' }, take: 1 },
            movimientos: true,
          },
        },
      },
    });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado.');

    const precioQq = precioOverride ?? (ciclo.precioReferenciaQq ? Number(ciclo.precioReferenciaQq) : null);
    if (precioQq == null) {
      throw new NotFoundException(
        'El ciclo no tiene precio de referencia por quintal. Defínelo en el ciclo o envíalo en la consulta.',
      );
    }

    let efectivoNecesario = 0;
    let porCobrarTrasCosecha = 0;
    let produccionTotalQq = 0;
    let sinProyeccion = 0;

    const detalle = ciclo.participaciones.map((p) => {
      const ultima = p.inspecciones[0] ?? null;
      const haSembradas = p.lotes.reduce((acc, l) => acc + Number(l.areaSembradaHa), 0);
      const haEfectivas = ultima?.areaEfectivaHa != null ? Number(ultima.areaEfectivaHa) : haSembradas;

      const rendimiento = ultima?.rendimientoProyectadoQqHa != null
        ? Number(ultima.rendimientoProyectadoQqHa) : null;
      if (rendimiento == null) sinProyeccion++;

      const produccionQq = rendimiento != null ? rendimiento * haEfectivas : 0;
      const valorCosecha = produccionQq * precioQq;

      const deuda = p.movimientos.reduce(
        (acc, m) => acc + Number(m.monto) * this.signo(m.tipo), 0,
      );

      const neto = valorCosecha - deuda;
      if (neto > 0) efectivoNecesario += neto;
      else porCobrarTrasCosecha += Math.abs(neto);

      produccionTotalQq += produccionQq;

      return {
        cicloProductorId: p.id,
        productor: p.productor.nombre,
        haEfectivas,
        rendimientoProyectadoQqHa: rendimiento,
        produccionProyectadaQq: produccionQq,
        valorCosechaEsperada: valorCosecha,
        deudaActual: deuda,
        // Positivo: CAD debe pagarle al productor. Negativo: queda debiendo a CAD.
        netoAPagarAlProductor: neto > 0 ? neto : 0,
        saldoPendientePorCobrar: neto < 0 ? Math.abs(neto) : 0,
        tieneProyeccion: rendimiento != null,
      };
    });

    return {
      ciclo: { id: ciclo.id, nombre: ciclo.nombre, cultivo: ciclo.cultivo },
      precioQqUtilizado: precioQq,
      produccionTotalProyectadaQq: produccionTotalQq,
      efectivoNecesarioParaPagos: efectivoNecesario,
      porCobrarTrasCosecha,
      // Advertencia de confiabilidad: si muchos productores no tienen visita
      // con proyección, la cifra de efectivo está subestimada.
      participacionesSinProyeccion: sinProyeccion,
      confiabilidad: ciclo.participaciones.length > 0
        ? (ciclo.participaciones.length - sinProyeccion) / ciclo.participaciones.length
        : 0,
      detalle,
    };
  }
}
