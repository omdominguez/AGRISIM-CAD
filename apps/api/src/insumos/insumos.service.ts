import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

/**
 * INVENTARIO REAL DE INSUMOS.
 *
 * CAD compra insumos a stock (con precio real e histórico) y los
 * productores retiran de a poco, según lo van necesitando — no se les
 * entrega el paquete completo de una vez. `PaqueteItem` (en el módulo de
 * solicitudes) sigue siendo el plan/presupuesto aprobado; lo de aquí es lo
 * que realmente entró y salió del almacén.
 *
 * El costo se lleva por PROMEDIO PONDERADO: cada compra recalcula el costo
 * promedio de ese insumo; cada retiro se congela al costo promedio del
 * momento (si el precio de compra sube después, no afecta retiros ya
 * hechos). Es el método estándar cuando no se separa lote por lote.
 */
@Injectable()
export class InsumosService {
  constructor(private prisma: PrismaService) {}

  listarCatalogo() {
    return this.prisma.insumo.findMany({ orderBy: { nombre: 'asc' } });
  }

  async obtenerInsumo(id: string) {
    const insumo = await this.prisma.insumo.findUnique({
      where: { id },
      include: {
        compras: { orderBy: { fecha: 'desc' } },
        retiros: {
          orderBy: { fecha: 'desc' },
          include: { solicitud: { include: { cicloProductor: { include: { productor: true } } } } },
        },
      },
    });
    if (!insumo) throw new NotFoundException('Insumo no encontrado.');
    return insumo;
  }

  crearInsumo(nombre: string, categoria: string, unidad: string) {
    return this.prisma.insumo.create({ data: { nombre, categoria: categoria as any, unidad } });
  }

  /**
   * Compra: sube el stock y recalcula el costo promedio ponderado.
   *   nuevoPromedio = (stockActual × costoActual + cantidadComprada × costoCompra)
   *                   / (stockActual + cantidadComprada)
   */
  async registrarCompra(
    insumoId: string,
    fecha: string,
    cantidad: number,
    costoUnitario: number,
    proveedor: string | undefined,
    notas: string | undefined,
    usuarioId: string,
  ) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id: insumoId } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado.');

    const stockActual = Number(insumo.stockActual);
    const costoActual = Number(insumo.costoPromedioPonderado);
    const stockNuevo = stockActual + cantidad;
    const costoPromedioNuevo = stockNuevo > 0
      ? (stockActual * costoActual + cantidad * costoUnitario) / stockNuevo
      : costoUnitario;

    const [compra] = await this.prisma.$transaction([
      this.prisma.compraInsumo.create({
        data: {
          insumoId, fecha: new Date(fecha), cantidad, costoUnitario, proveedor, notas,
          registradoPorId: usuarioId,
        },
      }),
      this.prisma.insumo.update({
        where: { id: insumoId },
        data: { stockActual: stockNuevo, costoPromedioPonderado: costoPromedioNuevo },
      }),
    ]);

    return compra;
  }

  /**
   * Retiro: un productor saca insumos contra su expediente aprobado.
   * Valida stock disponible, congela el costo al promedio ponderado actual,
   * le aplica el margen de ESA solicitud (no un % fijo del sistema), y
   * genera el movimiento de cuenta automáticamente — igual que ya hacían
   * los despachos, para que la cartera nunca dependa de un registro aparte.
   */
  async registrarRetiro(insumoId: string, solicitudId: string, fecha: string, cantidad: number, usuarioId: string) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id: insumoId } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado.');

    const stockActual = Number(insumo.stockActual);
    if (cantidad > stockActual) {
      throw new BadRequestException(
        `No hay suficiente stock de "${insumo.nombre}" — disponible: ${stockActual} ${insumo.unidad}, solicitado: ${cantidad} ${insumo.unidad}.`,
      );
    }

    const solicitud = await this.prisma.solicitudFinanciamiento.findUnique({
      where: { id: solicitudId },
      include: { cicloProductor: true },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');

    const estadosValidos = ['CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO'];
    if (!estadosValidos.includes(solicitud.estado)) {
      throw new BadRequestException('El contrato debe estar firmado antes de poder retirar insumos.');
    }

    const costoUnitarioAlMomento = Number(insumo.costoPromedioPonderado);
    const costoTotal = cantidad * costoUnitarioAlMomento;
    const montoCobradoConMargen = costoTotal * (1 + Number(solicitud.margenInsumosPct));

    const [retiro] = await this.prisma.$transaction([
      this.prisma.retiroInsumo.create({
        data: {
          insumoId, solicitudId, fecha: new Date(fecha), cantidad,
          costoUnitarioAlMomento, costoTotal, montoCobradoConMargen,
          registradoPorId: usuarioId,
        },
      }),
      this.prisma.insumo.update({
        where: { id: insumoId },
        data: { stockActual: stockActual - cantidad },
      }),
      this.prisma.movimientoCuenta.create({
        data: {
          productorId: solicitud.cicloProductor.productorId,
          cicloProductorId: solicitud.cicloProductorId,
          tipo: TipoMovimiento.CARGO_INSUMOS,
          concepto: `Retiro: ${cantidad} ${insumo.unidad} de ${insumo.nombre} (+${(Number(solicitud.margenInsumosPct) * 100).toFixed(0)}%)`,
          fecha: new Date(fecha),
          monto: montoCobradoConMargen,
        },
      }),
    ]);

    // Si es el primer retiro real, el expediente pasa a "despachada" — así
    // el estado refleja que ya empezó a moverse insumo de verdad.
    if (solicitud.estado === 'CONTRATO_FIRMADO') {
      await this.prisma.solicitudFinanciamiento.update({
        where: { id: solicitudId },
        data: { estado: 'DESPACHADA' },
      });
    }

    return retiro;
  }

  /** Historial de retiros de una solicitud — para ver cuánto se le ha dado a ese productor y con qué. */
  historialRetiros(solicitudId: string) {
    return this.prisma.retiroInsumo.findMany({
      where: { solicitudId },
      include: { insumo: { select: { nombre: true, unidad: true, categoria: true } } },
      orderBy: { fecha: 'desc' },
    });
  }
}
