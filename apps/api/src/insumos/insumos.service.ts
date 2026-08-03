import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoMovimiento } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';

/** Fila cruda que devuelve el SELECT ... FOR UPDATE sobre "insumos". */
interface FilaInsumoBloqueado {
  id: string;
  nombre: string;
  unidad: string;
  stockActual: any;
  costoPromedioPonderado: any;
}

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

  async actualizarInsumo(id: string, nombre?: string, unidad?: string) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado.');
    return this.prisma.insumo.update({
      where: { id },
      data: { nombre: nombre ?? undefined, unidad: unidad ?? undefined },
    });
  }

  /**
   * Solo se puede borrar un insumo si nunca tuvo movimiento real (ni
   * compras ni retiros) — de lo contrario se perdería el histórico de
   * precios y de qué se le entregó a cada productor.
   */
  async eliminarInsumo(id: string) {
    const insumo = await this.prisma.insumo.findUnique({
      where: { id },
      include: { compras: true, retiros: true },
    });
    if (!insumo) throw new NotFoundException('Insumo no encontrado.');

    if (insumo.compras.length > 0 || insumo.retiros.length > 0) {
      throw new BadRequestException(
        'Este insumo ya tiene compras o retiros registrados — no se puede borrar sin perder ese histórico. Si ya no se usa, simplemente déjalo con stock en 0.',
      );
    }

    await this.prisma.insumo.delete({ where: { id } });
    return { eliminado: true };
  }

  /**
   * Compra: sube el stock y recalcula el costo promedio ponderado.
   *   nuevoPromedio = (stockActual × costoActual + cantidadComprada × costoCompra)
   *                   / (stockActual + cantidadComprada)
   *
   * Todo el ciclo lectura→cálculo→escritura va dentro de UNA transacción
   * con `SELECT ... FOR UPDATE` sobre la fila del insumo. Sin esto, dos
   * compras casi simultáneas del mismo insumo pueden pisarse entre sí
   * (lost update) y el costo promedio queda mal calculado sin que nadie
   * vea un error.
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
    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<FilaInsumoBloqueado[]>`
        SELECT "id", "nombre", "unidad", "stockActual", "costoPromedioPonderado"
        FROM "insumos" WHERE "id" = ${insumoId} FOR UPDATE
      `;
      const insumo = filas[0];
      if (!insumo) throw new NotFoundException('Insumo no encontrado.');

      const stockActual = Number(insumo.stockActual);
      const costoActual = Number(insumo.costoPromedioPonderado);
      const stockNuevo = stockActual + cantidad;
      const costoPromedioNuevo = stockNuevo > 0
        ? (stockActual * costoActual + cantidad * costoUnitario) / stockNuevo
        : costoUnitario;

      const compra = await tx.compraInsumo.create({
        data: {
          insumoId, fecha: new Date(fecha), cantidad, costoUnitario, proveedor, notas,
          registradoPorId: usuarioId,
        },
      });
      await tx.insumo.update({
        where: { id: insumoId },
        data: { stockActual: stockNuevo, costoPromedioPonderado: costoPromedioNuevo },
      });

      return compra;
    });
  }

  /**
   * Retiro: un productor saca insumos contra su expediente aprobado.
   * Valida stock disponible, congela el costo al promedio ponderado actual,
   * le aplica el margen de ESA solicitud (no un % fijo del sistema), y
   * genera el movimiento de cuenta automáticamente — igual que ya hacían
   * los despachos, para que la cartera nunca dependa de un registro aparte.
   */
  async registrarRetiro(insumoId: string, solicitudId: string, fecha: string, cantidad: number, usuarioId: string) {
    const solicitud = await this.prisma.solicitudFinanciamiento.findUnique({
      where: { id: solicitudId },
      include: { cicloProductor: true },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');

    const estadosValidos = ['CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO'];
    if (!estadosValidos.includes(solicitud.estado)) {
      throw new BadRequestException('El contrato debe estar firmado antes de poder retirar insumos.');
    }

    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<FilaInsumoBloqueado[]>`
        SELECT "id", "nombre", "unidad", "stockActual", "costoPromedioPonderado"
        FROM "insumos" WHERE "id" = ${insumoId} FOR UPDATE
      `;
      const insumo = filas[0];
      if (!insumo) throw new NotFoundException('Insumo no encontrado.');

      const stockActual = Number(insumo.stockActual);
      if (cantidad > stockActual) {
        throw new BadRequestException(
          `No hay suficiente stock de "${insumo.nombre}" — disponible: ${stockActual} ${insumo.unidad}, solicitado: ${cantidad} ${insumo.unidad}.`,
        );
      }

      const costoUnitarioAlMomento = Number(insumo.costoPromedioPonderado);
      const costoTotal = cantidad * costoUnitarioAlMomento;
      const montoCobradoConMargen = costoTotal * (1 + Number(solicitud.margenInsumosPct));

      const retiro = await tx.retiroInsumo.create({
        data: {
          insumoId, solicitudId, fecha: new Date(fecha), cantidad,
          costoUnitarioAlMomento, costoTotal, montoCobradoConMargen,
          registradoPorId: usuarioId,
        },
      });
      await tx.insumo.update({
        where: { id: insumoId },
        data: { stockActual: stockActual - cantidad },
      });
      await tx.movimientoCuenta.create({
        data: {
          productorId: solicitud.cicloProductor.productorId,
          cicloProductorId: solicitud.cicloProductorId,
          tipo: TipoMovimiento.CARGO_INSUMOS,
          concepto: `Retiro: ${cantidad} ${insumo.unidad} de ${insumo.nombre} (+${(Number(solicitud.margenInsumosPct) * 100).toFixed(0)}%)`,
          fecha: new Date(fecha),
          monto: montoCobradoConMargen,
        },
      });

      // Si es el primer retiro real, el expediente pasa a "despachada" — así
      // el estado refleja que ya empezó a moverse insumo de verdad.
      if (solicitud.estado === 'CONTRATO_FIRMADO') {
        await tx.solicitudFinanciamiento.update({
          where: { id: solicitudId },
          data: { estado: 'DESPACHADA' },
        });
      }

      return retiro;
    });
  }

  /** Historial de retiros de una solicitud — para ver cuánto se le ha dado a ese productor y con qué. */
  historialRetiros(solicitudId: string) {
    return this.prisma.retiroInsumo.findMany({
      where: { solicitudId },
      include: { insumo: { select: { nombre: true, unidad: true, categoria: true } } },
      orderBy: { fecha: 'desc' },
    });
  }

  // ==========================================================================
  // MÓDULO DE COMPRAS — vista global de todo lo que ha entrado al almacén,
  // sin importar de qué insumo. El registro puntual (POST /insumos/:id/compras)
  // sigue igual; esto es solo para verlas todas juntas.
  // ==========================================================================
  listarTodasLasCompras() {
    return this.prisma.compraInsumo.findMany({
      include: { insumo: { select: { nombre: true, unidad: true, categoria: true } } },
      orderBy: { fecha: 'desc' },
    });
  }

  // ==========================================================================
  // MÓDULO DE VENTAS — la entrega de insumos como una factura real, con
  // varias líneas a la vez. Reemplaza el "retiro suelto por insumo" como
  // mecanismo principal de aquí en adelante.
  // ==========================================================================

  listarVentas() {
    return this.prisma.venta.findMany({
      include: {
        items: { include: { insumo: { select: { nombre: true, unidad: true } } } },
        solicitud: { include: { cicloProductor: { include: { productor: true, ciclo: true } } } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  obtenerVentasDeSolicitud(solicitudId: string) {
    return this.prisma.venta.findMany({
      where: { solicitudId },
      include: { items: { include: { insumo: { select: { nombre: true, unidad: true } } } } },
      orderBy: { fecha: 'desc' },
    });
  }

  /** Genera un número de factura prácticamente único: sello de tiempo en base36 + 6 hex al azar. */
  private generarNumeroFactura(): string {
    const sello = Date.now().toString(36).toUpperCase();
    const azar = randomBytes(3).toString('hex').toUpperCase();
    return `V-${sello}-${azar}`;
  }

  /**
   * Crea la factura de venta completa: agrupa cantidades por insumo (si el
   * mismo insumo aparece en dos líneas, se validan y descuentan juntas —
   * antes se validaban por separado y una línea podía pisar el descuento
   * de stock de la otra), bloquea cada fila de insumo involucrada con
   * `SELECT ... FOR UPDATE` en un orden fijo (evita deadlocks si dos
   * facturas comparten insumos), congela el costo promedio ponderado de
   * cada insumo en ese momento, aplica el margen de ESA solicitud, descuenta
   * el inventario, y genera UN SOLO movimiento de cuenta con el total — así
   * la cartera del productor ve "Factura V-xxxx" como un solo cargo, igual
   * que vería una factura real, no una fila por cada insumo.
   */
  async crearVenta(
    solicitudId: string,
    fecha: string,
    items: { insumoId: string; cantidad: number }[],
    usuarioId: string,
  ) {
    if (items.length === 0) throw new BadRequestException('La factura necesita al menos una línea.');

    // Agrupar cantidades por insumo ANTES de validar stock — si el usuario
    // repite el mismo insumo en dos líneas (el formulario lo permite), deben
    // sumarse y validarse contra el stock total juntas, no cada una por
    // separado contra el mismo stock original.
    const cantidadPorInsumo = new Map<string, number>();
    for (const item of items) {
      if (!item.insumoId) throw new BadRequestException('Cada línea necesita un insumo seleccionado.');
      if (!(item.cantidad > 0)) throw new BadRequestException('Cada línea necesita una cantidad mayor a cero.');
      cantidadPorInsumo.set(item.insumoId, (cantidadPorInsumo.get(item.insumoId) ?? 0) + item.cantidad);
    }
    // Orden fijo de bloqueo (por id) para que dos facturas concurrentes que
    // comparten insumos siempre los tomen en el mismo orden y no se
    // generen deadlocks en Postgres.
    const insumoIdsOrdenados = [...cantidadPorInsumo.keys()].sort();

    const solicitud = await this.prisma.solicitudFinanciamiento.findUnique({
      where: { id: solicitudId },
      include: { cicloProductor: true },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');

    const estadosValidos = ['CONTRATO_FIRMADO', 'DESPACHADA', 'EN_SEGUIMIENTO'];
    if (!estadosValidos.includes(solicitud.estado)) {
      throw new BadRequestException('El contrato debe estar firmado antes de poder facturar insumos.');
    }

    const margen = Number(solicitud.margenInsumosPct);

    const MAX_INTENTOS = 3;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const numeroFactura = this.generarNumeroFactura();
      try {
        return await this.prisma.$transaction(async (tx) => {
          const insumosBloqueados = new Map<string, { id: string; nombre: string; unidad: string; stockActual: number; costoPromedioPonderado: number }>();

          for (const insumoId of insumoIdsOrdenados) {
            const filas = await tx.$queryRaw<FilaInsumoBloqueado[]>`
              SELECT "id", "nombre", "unidad", "stockActual", "costoPromedioPonderado"
              FROM "insumos" WHERE "id" = ${insumoId} FOR UPDATE
            `;
            const insumo = filas[0];
            if (!insumo) throw new NotFoundException(`Insumo ${insumoId} no encontrado.`);

            const cantidadPedida = cantidadPorInsumo.get(insumoId)!;
            const stockActual = Number(insumo.stockActual);
            if (cantidadPedida > stockActual) {
              throw new BadRequestException(
                `No hay suficiente stock de "${insumo.nombre}" — disponible: ${stockActual} ${insumo.unidad}, solicitado: ${cantidadPedida} ${insumo.unidad}.`,
              );
            }

            insumosBloqueados.set(insumoId, {
              id: insumo.id,
              nombre: insumo.nombre,
              unidad: insumo.unidad,
              stockActual,
              costoPromedioPonderado: Number(insumo.costoPromedioPonderado),
            });
          }

          // Las líneas de la factura conservan el orden y desglose original
          // que armó el usuario (para que la factura se vea como él la
          // construyó); el costo congelado sale del insumo ya bloqueado y
          // validado arriba.
          const lineas = items.map((item) => {
            const insumo = insumosBloqueados.get(item.insumoId)!;
            const costoUnitarioAlMomento = insumo.costoPromedioPonderado;
            const costoTotal = item.cantidad * costoUnitarioAlMomento;
            const montoCobradoConMargen = costoTotal * (1 + margen);
            return { insumo, cantidad: item.cantidad, costoUnitarioAlMomento, costoTotal, montoCobradoConMargen };
          });

          const subtotalCosto = lineas.reduce((acc, l) => acc + l.costoTotal, 0);
          const totalConMargen = lineas.reduce((acc, l) => acc + l.montoCobradoConMargen, 0);

          const venta = await tx.venta.create({
            data: {
              numeroFactura,
              solicitudId,
              fecha: new Date(fecha),
              subtotalCosto,
              totalConMargen,
              registradoPorId: usuarioId,
              items: {
                create: lineas.map((l) => ({
                  insumoId: l.insumo.id,
                  cantidad: l.cantidad,
                  costoUnitarioAlMomento: l.costoUnitarioAlMomento,
                  costoTotal: l.costoTotal,
                  montoCobradoConMargen: l.montoCobradoConMargen,
                })),
              },
            },
          });

          // Descuenta cada insumo UNA sola vez con la cantidad ya agrupada
          // — sin este agrupamiento, dos líneas del mismo insumo generaban
          // dos updates independientes y la segunda pisaba a la primera.
          for (const [insumoId, cantidadPedida] of cantidadPorInsumo) {
            const insumo = insumosBloqueados.get(insumoId)!;
            await tx.insumo.update({
              where: { id: insumoId },
              data: { stockActual: insumo.stockActual - cantidadPedida },
            });
          }

          await tx.movimientoCuenta.create({
            data: {
              productorId: solicitud.cicloProductor.productorId,
              cicloProductorId: solicitud.cicloProductorId,
              tipo: TipoMovimiento.CARGO_INSUMOS,
              concepto: `Factura ${numeroFactura} — ${lineas.length} insumo${lineas.length > 1 ? 's' : ''} (+${(margen * 100).toFixed(0)}%)`,
              fecha: new Date(fecha),
              monto: totalConMargen,
            },
          });

          if (solicitud.estado === 'CONTRATO_FIRMADO') {
            await tx.solicitudFinanciamiento.update({
              where: { id: solicitudId },
              data: { estado: 'DESPACHADA' },
            });
          }

          return tx.venta.findUnique({
            where: { id: venta.id },
            include: { items: { include: { insumo: true } } },
          });
        });
      } catch (err: any) {
        // Colisión (extremadamente improbable) del número de factura —
        // se reintenta con un número nuevo. Cualquier otro error (stock
        // insuficiente, solicitud no encontrada, etc.) se propaga tal cual.
        const esColisionDeNumero = err?.code === 'P2002' && err?.meta?.target?.includes?.('numeroFactura');
        if (esColisionDeNumero && intento < MAX_INTENTOS) continue;
        throw err;
      }
    }

    throw new BadRequestException('No se pudo generar un número de factura único, intenta de nuevo.');
  }
}
