import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CyclesService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.ciclo.findMany({
      include: {
        productor: true,
        parcela: true,
        tecnicoResponsable: { select: { nombre: true } },
        solicitud: { select: { id: true, estado: true } }, // estado real del financiamiento
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  crear(data: any) {
    return this.prisma.ciclo.create({ data });
  }
}
