import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { validateEnv } from './config/env';

/**
 * NOX & LUX API — bootstrap (NL-12).
 * La configuración de seguridad (helmet, CORS, ValidationPipe estricto, filtro
 * global de errores y rate limiting) vive en `configureApp()`. `validateEnv()`
 * hace fail-fast si los secretos faltan o usan valores de ejemplo.
 */
async function bootstrap() {
  const env = validateEnv();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  await app.listen(env.apiPort);
  console.log(`NOX & LUX API listening on http://localhost:${env.apiPort}/api`);
}

void bootstrap();