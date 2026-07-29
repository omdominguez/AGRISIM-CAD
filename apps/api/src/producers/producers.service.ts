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
}
