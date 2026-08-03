import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

interface DatosProveedor {
  nombre?: string;
  rif?: string;
  telefono?: string;
  contacto?: string;
  notas?: string;
}

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } });
  }

  async obtener(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
      include: {
        ordenesCompra: {
          orderBy: { fecha: 'desc' },
          include: { lineas: { include: { insumo: { select: { nombre: true, unidad: true } } } } },
        },
      },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado.');
    return proveedor;
  }

  async crear(datos: DatosProveedor) {
    try {
      return await this.prisma.proveedor.create({
        data: {
          nombre: datos.nombre!,
          rif: datos.rif || undefined,
          telefono: datos.telefono || undefined,
          contacto: datos.contacto || undefined,
          notas: datos.notas || undefined,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' && err?.meta?.target?.includes?.('rif')) {
        throw new BadRequestException(`Ya existe un proveedor registrado con el RIF "${datos.rif}".`);
      }
      throw err;
    }
  }

  async actualizar(id: string, datos: DatosProveedor) {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado.');

    try {
      return await this.prisma.proveedor.update({
        where: { id },
        data: {
          nombre: datos.nombre ?? undefined,
          rif: datos.rif ?? undefined,
          telefono: datos.telefono ?? undefined,
          contacto: datos.contacto ?? undefined,
          notas: datos.notas ?? undefined,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' && err?.meta?.target?.includes?.('rif')) {
        throw new BadRequestException(`Ya existe un proveedor registrado con el RIF "${datos.rif}".`);
      }
      throw err;
    }
  }

  /** Solo se puede borrar si nunca tuvo una orden de compra — igual que con insumos, para no perder histórico. */
  async eliminar(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
      include: { ordenesCompra: true },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado.');

    if (proveedor.ordenesCompra.length > 0) {
      throw new BadRequestException(
        'Este proveedor ya tiene órdenes de compra registradas — no se puede borrar sin perder ese histórico.',
      );
    }

    await this.prisma.proveedor.delete({ where: { id } });
    return { eliminado: true };
  }
}
