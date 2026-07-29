import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProducersModule } from './producers/producers.module';
import { ParcelsModule } from './parcels/parcels.module';
import { CyclesModule } from './cycles/cycles.module';
import { FieldModule } from './field/field.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { AccountsModule } from './accounts/accounts.module';
import { FinancingSimulationsModule } from './financing-simulations/financing-simulations.module';
import { NewsFeedModule } from './news-feed/news-feed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProducersModule,   // productores y fincas
    ParcelsModule,     // parcelas + importación KML (área geodésica)
    CyclesModule,      // ciclo-campaña, participaciones, lotes de siembra
    FieldModule,       // inspecciones, población de plantas, fitosanitario
    SolicitudesModule, // expediente de financiamiento (6 pasos)
    AccountsModule,    // estados de cuenta y proyección de efectivo
    FinancingSimulationsModule,
    NewsFeedModule,
  ],
})
export class AppModule {}
