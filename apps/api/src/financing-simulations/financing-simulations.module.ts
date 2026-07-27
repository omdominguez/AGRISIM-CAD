import { Module } from '@nestjs/common';
import { FinancingSimulationsService } from './financing-simulations.service';
import { FinancingSimulationsController } from './financing-simulations.controller';

@Module({
  providers: [FinancingSimulationsService],
  controllers: [FinancingSimulationsController],
  exports: [FinancingSimulationsService],
})
export class FinancingSimulationsModule {}
