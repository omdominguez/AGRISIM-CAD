import { Module } from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';

@Module({
  providers: [ParcelsService],
  controllers: [ParcelsController],
})
export class ParcelsModule {}
