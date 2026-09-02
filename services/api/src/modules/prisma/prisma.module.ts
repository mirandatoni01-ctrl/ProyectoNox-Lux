import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global de base de datos (Prisma/PostgreSQL, ADR-NL-005).
 * Se exporta globalmente para que cualquier módulo del backend pueda
 * inyectar `PrismaService` sin repetir la importación.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
