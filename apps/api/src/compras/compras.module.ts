import { Module } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';
import { OrdenesCompraService } from './ordenes-compra.service';
import { OrdenesCompraController } from './ordenes-compra.controller';

@Module({
  providers: [ProveedoresService, OrdenesCompraService],
  controllers: [ProveedoresController, OrdenesCompraController],
})
export class ComprasModule {}
