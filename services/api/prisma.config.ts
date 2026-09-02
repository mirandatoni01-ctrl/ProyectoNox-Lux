import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Configuración de Prisma para el API (NL-03, PRISMA 7).
 * La cadena de conexión PostgreSQL (ADR-NL-005) se lee desde el entorno.
 * El adapter de conexión real (adapter-pg + pg) se usará en NL-04.
 * Ver docs/03-architecture/DATA_MODEL.md.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
