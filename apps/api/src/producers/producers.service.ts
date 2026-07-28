import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ProducersService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.productor.findMany({
      include: { fincas: { include: { lotes: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  crear(data: {
    nombre: string; codigoSima?: string; cedulaRif?: string; telefono?: string; email?: string; ubicacionZona?: string;
  }) {
    return this.prisma.productor.create({ data });
  }

  obtener(id: string) {
    return this.prisma.productor.findUnique({
      where: { id },
      include: { fincas: { include: { lotes: true } }, ciclos: true },
    });
  }
}
