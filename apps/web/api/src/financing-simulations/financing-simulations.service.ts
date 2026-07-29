import { Injectable } from '@nestjs/common';
import { CalcularSimulacionDto } from './dto';

/**
 * CALCULADORA RÁPIDA — replica exactamente el flujo real de CAD:
 *
 *   Paso 2 del flujo: Paquete Tecnológico (+30% margen) + Anticipo opcional (+5% recargo)
 *   Paso 6 del flujo: Cobro = (Costo Insumos x 1.30) + (Anticipo x 1.05)
 *
 * Esta calculadora NO persiste nada — es para que un técnico o gerente vea
 * el resultado antes de abrir un expediente formal (SolicitudFinanciamiento).
 * El expediente real, con sus 6 etapas, vive en el módulo `solicitudes`.
 */
@Injectable()
export class FinancingSimulationsService {
  calcular(dto: CalcularSimulacionDto) {
    const margenInsumosPct = dto.margenInsumosPct ?? 0.30;
    const recargoAnticipoPct = dto.recargoAnticipoPct ?? 0.05;
    const montoAnticipo = dto.solicitaAnticipo ? (dto.montoAnticipo ?? 0) : 0;

    // --- Insumos ---
    const montoInsumosConMargen = dto.costoTotalInsumos * (1 + margenInsumosPct);
    const gananciaInsumos = montoInsumosConMargen - dto.costoTotalInsumos;

    // --- Anticipo ---
    const montoAnticipoConRecargo = montoAnticipo * (1 + recargoAnticipoPct);
    const gananciaAnticipo = montoAnticipoConRecargo - montoAnticipo;

    // --- Totales del expediente ---
    const montoTotalADesembolsar = dto.costoTotalInsumos + montoAnticipo; // lo que CAD entrega/gira
    const totalACobrarEnLiquidacion = montoInsumosConMargen + montoAnticipoConRecargo;
    const gananciaEsperadaCAD = gananciaInsumos + gananciaAnticipo;
    const margenSobreDesembolsoPct =
      montoTotalADesembolsar > 0 ? gananciaEsperadaCAD / montoTotalADesembolsar : 0;

    // --- Referencia opcional: ¿la cosecha esperada alcanza para cubrir el cobro? ---
    let produccionEsperadaQq: number | null = null;
    let ingresoBrutoEsperado: number | null = null;
    let coberturaCosechaPct: number | null = null;

    if (dto.rendimientoEsperadoQqHa && dto.areaHectareas && dto.precioVentaQq) {
      produccionEsperadaQq = dto.rendimientoEsperadoQqHa * dto.areaHectareas;
      ingresoBrutoEsperado = produccionEsperadaQq * dto.precioVentaQq;
      coberturaCosechaPct =
        totalACobrarEnLiquidacion > 0 ? ingresoBrutoEsperado / totalACobrarEnLiquidacion : null;
    }

    return {
      montoInsumosConMargen,
      gananciaInsumos,
      montoAnticipoConRecargo,
      gananciaAnticipo,
      montoTotalADesembolsar,
      totalACobrarEnLiquidacion,
      gananciaEsperadaCAD,
      margenSobreDesembolsoPct,
      produccionEsperadaQq,
      ingresoBrutoEsperado,
      coberturaCosechaPct,
    };
  }
}
