import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class OrdenesCompraService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.ordenCompra.findMany({
      include: {
        proveedor: { select: { nombre: true } },
        lineas: { include: { insumo: { select: { nombre: true, unidad: true } } } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async obtener(id: string) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: { proveedor: true, lineas: { include: { insumo: true } } },
    });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada.');
    return orden;
  }

  /** Número de orden prácticamente único: sello de tiempo en base36 + 6 hex al azar. */
  private generarNumero(): string {
    const sello = Date.now().toString(36).toUpperCase();
    const azar = randomBytes(3).toString('hex').toUpperCase();
    return `OC-${sello}-${azar}`;
  }

  /**
   * Crea la orden de compra completa: un proveedor, fecha, y N líneas de
   * insumos ya existentes en el catálogo (nunca se crea el insumo desde
   * aquí — eso sigue siendo un paso previo en Insumos).
   *
   * Si el mismo insumo aparece en más de una línea de la orden (por ejemplo,
   * dos precios distintos del mismo insumo en la misma compra), las líneas
   * se agrupan ANTES de recalcular el costo promedio ponderado. El promedio
   * ponderado es asociativo — agrupar o aplicar una por una da
   * matemáticamente el mismo resultado — pero agrupar evita el bug real que
   * ya corregimos en `crearVenta`: dos `update` de stock separados sobre el
   * mismo insumo, donde el segundo pisa al primero en vez de sumarse.
   *
   * Cada línea igual se guarda como su propio registro `CompraInsumo` (con
   * su propio costoUnitario), para no perder el desglose de precios de la
   * orden — solo el recálculo de stock/promedio del insumo se hace de forma
   * agrupada y bloqueada con `SELECT ... FOR UPDATE`.
   */
  async crear(
    proveedorId: string,
    fecha: string,
    items: { insumoId: string; cantidad: number; costoUnitario: number }[],
    usuarioId: string,
  ) {
    if (items.length === 0) throw new BadRequestException('La orden de compra necesita al menos una línea.');
    for (const item of items) {
      if (!item.insumoId) throw new BadRequestException('Cada línea necesita un insumo seleccionado.');
      if (!(item.cantidad > 0)) throw new BadRequestException('Cada línea necesita una cantidad mayor a cero.');
      if (!(item.costoUnitario >= 0)) throw new BadRequestException('El costo unitario no puede ser negativo.');
    }

    const proveedor = await this.prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado.');

    // Totales agrupados por insumo — para el recálculo del promedio ponderado.
    const agregadoPorInsumo = new Map<string, { cantidad: number; costoTotal: number }>();
    for (const item of items) {
      const previo = agregadoPorInsumo.get(item.insumoId) ?? { cantidad: 0, costoTotal: 0 };
      agregadoPorInsumo.set(item.insumoId, {
        cantidad: previo.cantidad + item.cantidad,
        costoTotal: previo.costoTotal + item.cantidad * item.costoUnitario,
      });
    }
    // Orden fijo de bloqueo (por id) para que dos órdenes concurrentes que
    // comparten insumos siempre los tomen en el mismo orden y no se
    // generen deadlocks en Postgres.
    const insumoIdsOrdenados = [...agregadoPorInsumo.keys()].sort();

    const subtotal = items.reduce((acc, it) => acc + it.cantidad * it.costoUnitario, 0);

    const MAX_INTENTOS = 3;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      const numero = this.generarNumero();
      try {
        return await this.prisma.$transaction(async (tx) => {
          for (const insumoId of insumoIdsOrdenados) {
            const filas = await tx.$queryRaw<FilaInsumoBloqueado[]>`
              SELECT "id", "nombre", "unidad", "stockActual", "costoPromedioPonderado"
              FROM "insumos" WHERE "id" = ${insumoId} FOR UPDATE
            `;
            const insumo = filas[0];
            if (!insumo) throw new NotFoundException(`Insumo ${insumoId} no encontrado.`);

            const { cantidad: cantidadAgregada, costoTotal: costoTotalAgregado } = agregadoPorInsumo.get(insumoId)!;
            const stockActual = Number(insumo.stockActual);
            const costoActual = Number(insumo.costoPromedioPonderado);
            const stockNuevo = stockActual + cantidadAgregada;
            const costoPromedioNuevo = stockNuevo > 0
              ? (stockActual * costoActual + costoTotalAgregado) / stockNuevo
              : 0;

            await tx.insumo.update({
              where: { id: insumoId },
              data: { stockActual: stockNuevo, costoPromedioPonderado: costoPromedioNuevo },
            });
          }

          const orden = await tx.ordenCompra.create({
            data: {
              numero,
              proveedorId,
              fecha: new Date(fecha),
              subtotal,
              registradoPorId: usuarioId,
              lineas: {
                create: items.map((item) => ({
                  insumoId: item.insumoId,
                  fecha: new Date(fecha),
                  cantidad: item.cantidad,
                  costoUnitario: item.costoUnitario,
                  registradoPorId: usuarioId,
                })),
              },
            },
          });

          return tx.ordenCompra.findUnique({
            where: { id: orden.id },
            include: { proveedor: true, lineas: { include: { insumo: true } } },
          });
        });
      } catch (err: any) {
        // Colisión (extremadamente improbable) del número de orden — se
        // reintenta con uno nuevo. Cualquier otro error (insumo no
        // encontrado, proveedor no encontrado, etc.) se propaga tal cual.
        const esColisionDeNumero = err?.code === 'P2002' && err?.meta?.target?.includes?.('numero');
        if (esColisionDeNumero && intento < MAX_INTENTOS) continue;
        throw err;
      }
    }

    throw new BadRequestException('No se pudo generar un número de orden único, intenta de nuevo.');
  }
}
