import { z } from 'zod';

/**
 * Configuración de entorno (NL-12). `validateEnv()` se invoca en el bootstrap
 * (main.ts) y en `configureApp()`: ante cualquier secreto ausente o con valor
 * de ejemplo, el servidor NO arranca (fail-fast, decisión PO NL-12). En
 * producción además se exigen secretos ≥ 32 caracteres. Las variables
 * `THROTTLE_*` ajustan el rate limiting (express-rate-limit).
 */

const INSECURE_SECRETS = new Set([
  'dev-access-secret',
  'dev-refresh-secret',
  'changeme',
  'change-me',
  'example',
  'secret',
  'root',
]);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174'),
  UPLOAD_MAX_MB: z.coerce.number().int().min(1).max(50).default(5),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET es obligatorio'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET es obligatorio'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria').optional(),
  WHATSAPP_NUMBER: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().min(1).optional(),
});

export interface EnvConfig {
  nodeEnv: 'development' | 'test' | 'production';
  apiPort: number;
  corsOrigins: string[];
  uploadMaxMb: number;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
  };
  databaseUrl?: string;
  whatsappNumber?: string;
  google?: { clientId?: string; clientSecret?: string; callbackUrl?: string };
  rate: {
    ttlMs: number;
    globalMax: number;
    loginMax: number;
    refreshMax: number;
    ordersMax: number;
  };
}

const positiveInt = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/**
 * Valida el entorno de forma estricta. Lanza con un mensaje descriptivo si la
 * configuración es inválida o insegura — el boot falla rápidamente (NL-12).
 */
export function validateEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): EnvConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida (NL-12): ${issues}`);
  }

  const c = parsed.data;
  const isProd = c.NODE_ENV === 'production';

  const insecure = (value: string): boolean =>
    INSECURE_SECRETS.has(value.toLowerCase()) || (isProd && value.length < 32);
  if (insecure(c.JWT_ACCESS_SECRET) || insecure(c.JWT_REFRESH_SECRET)) {
    throw new Error(
      'Configuración de entorno inválida (NL-12): los secretos JWT no pueden usar ' +
        'valores de ejemplo o ser débiles',
    );
  }
  if (c.JWT_ACCESS_SECRET === c.JWT_REFRESH_SECRET) {
    throw new Error(
      'Configuración de entorno inválida (NL-12): JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben diferir',
    );
  }

  const corsOrigins = c.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigins.length === 0) {
    throw new Error('Configuración de entorno inválida (NL-12): CORS_ORIGINS vacía');
  }
  for (const origin of corsOrigins) {
    if (origin === '*' || !/^https?:\/\//.test(origin)) {
      throw new Error(
        `Configuración de entorno inválida (NL-12): origen CORS no permitido "${origin}"`,
      );
    }
  }

  const isTest = c.NODE_ENV === 'test';
  return {
    nodeEnv: c.NODE_ENV,
    apiPort: c.API_PORT,
    corsOrigins,
    uploadMaxMb: c.UPLOAD_MAX_MB,
    jwt: {
      accessSecret: c.JWT_ACCESS_SECRET,
      refreshSecret: c.JWT_REFRESH_SECRET,
      accessTtl: c.JWT_ACCESS_TTL,
      refreshTtl: c.JWT_REFRESH_TTL,
    },
    databaseUrl: c.DATABASE_URL,
    whatsappNumber: c.WHATSAPP_NUMBER,
    google: {
      clientId: c.GOOGLE_CLIENT_ID,
      clientSecret: c.GOOGLE_CLIENT_SECRET,
      callbackUrl: c.GOOGLE_CALLBACK_URL,
    },
    rate: {
      ttlMs: positiveInt(env.THROTTLE_TTL, 60_000),
      globalMax: positiveInt(env.THROTTLE_GLOBAL, isTest ? 3_600 : 300),
      loginMax: positiveInt(env.THROTTLE_LOGIN, isTest ? 3_600 : 5),
      refreshMax: positiveInt(env.THROTTLE_REFRESH, isTest ? 3_600 : 10),
      ordersMax: positiveInt(env.THROTTLE_ORDERS, isTest ? 3_600 : 10),
    },
  };
}