import { INestApplication, ValidationPipe } from '@nestjs/common';
import express, { Request } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { validateEnv } from './config/env';

/**
 * Configuración compartida de bootstrap (NL-12).
 * `main.ts` y los tests e2e de seguridad usan la MISMA configuración de
 * producción: helmet (headers de seguridad), CORS con allow-list, ValidationPipe
 * estricto (forbidNonWhitelisted → 400 ante mass-assignment), filtro global de
 * errores (sin leaks) y rate limiting por IP contra fuerza bruta/abuso.
 */
export function configureApp(app: INestApplication): INestApplication {
  const env = validateEnv();

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: env.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: false,
  });

  if (app.getHttpAdapter()?.getType?.() === 'express') {
    app.use(helmet());
    // Límite explícito de tamaño para cuerpos JSON (1 MB); multipart se maneja
    // en los interceptores de multer (media).
    app.use(express.json({ limit: '1mb' }));
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (app.getHttpAdapter()?.getType?.() === 'express') {
    const { rate } = env;
    const isAssetOrPublic = (req: Request): boolean => {
      const url: string = req.originalUrl ?? '';
      return (
        url.startsWith('/api/media/file') ||
        url === '/api/health' ||
        url.includes('/api/products/catalog')
      );
    };
    app.use(
      rateLimit({
        windowMs: rate.ttlMs,
        limit: rate.globalMax,
        standardHeaders: true,
        legacyHeaders: false,
        skip: isAssetOrPublic,
        message: { statusCode: 429, message: 'Demasiadas solicitudes', error: 'Too Many Requests' },
      }),
    );
    app.use(
      '/api/auth/login',
      rateLimit({
        windowMs: rate.ttlMs,
        limit: rate.loginMax,
        standardHeaders: true,
        legacyHeaders: false,
        message: { statusCode: 429, message: 'Demasiados intentos de acceso', error: 'Too Many Requests' },
      }),
    );
    app.use(
      '/api/auth/refresh',
      rateLimit({
        windowMs: rate.ttlMs,
        limit: rate.refreshMax,
        standardHeaders: true,
        legacyHeaders: false,
        message: { statusCode: 429, message: 'Demasiadas renovaciones de sesión', error: 'Too Many Requests' },
      }),
    );
    app.use(
      '/api/orders',
      rateLimit({
        windowMs: rate.ttlMs,
        limit: rate.ordersMax,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.method !== 'POST',
        message: { statusCode: 429, message: 'Demasiados pedidos', error: 'Too Many Requests' },
      }),
    );
  }

  return app;
}