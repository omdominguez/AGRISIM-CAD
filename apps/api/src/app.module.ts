import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProducersModule } from './producers/producers.module';
import { ParcelsModule } from './parcels/parcels.module';
import { CyclesModule } from './cycles/cycles.module';
import { FinancingSimulationsModule } from './financing-simulations/financing-simulations.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { NewsFeedModule } from './news-feed/news-feed.module';
import { PrismaModule } from './common/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProducersModule,
    ParcelsModule,
    CyclesModule,
    FinancingSimulationsModule,
    SolicitudesModule,
    NewsFeedModule,
  ],
})
export class AppModule {}
