import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cada deploy de Vercel genera una URL distinta (con un hash único), así
  // que fijar un solo origen exacto se rompe con cada redeploy. Se acepta
  // localhost (desarrollo), la URL fija de WEB_APP_URL si se definió
  // (útil para un dominio propio más adelante), y cualquier subdominio de
  // *.vercel.app — que es de donde salen todos los deploys del frontend.
  const origenesFijos = ['http://localhost:3000'];
  if (process.env.WEB_APP_URL) origenesFijos.push(process.env.WEB_APP_URL);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // peticiones sin origin (ej. curl, Postman)
      const esVercel = /\.vercel\.app$/.test(new URL(origin).hostname);
      if (origenesFijos.includes(origin) || esVercel) {
        return callback(null, true);
      }
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`CAD Agrícola API corriendo en http://localhost:${port}/api`);
}
bootstrap();
