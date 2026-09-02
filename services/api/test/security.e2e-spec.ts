import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MEDIA_STORAGE } from '../src/modules/media/storage/media-storage';

// Configuración de entorno mínima válida para bootear con fail-fast (NL-12).
process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-largo-NL12';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-otro-largo-NL12';
process.env.JWT_ACCESS_TTL = '900';
process.env.JWT_REFRESH_TTL = '604800';
process.env.CORS_ORIGINS =
  'http://localhost:5173,http://localhost:5174,http://trusted.example.com';
// Rate limiting bajo para poder probar el 429 en e2e (config leída en el boot).
process.env.THROTTLE_LOGIN = '20';
process.env.THROTTLE_GLOBAL = '10000';

// Roles con distintos niveles de permiso (usado en la matriz 403/200).
const superAdmin = {
  id: 'e2e-super-admin',
  email: 'super@noxlux.test',
  passwordHash: 'mock-argon2:superpass',
  fullName: 'Super Admin',
  isActive: true,
  roles: [{ role: { code: 'SUPER_ADMIN', permissions: [{ permission: { code: '*' } }] } }],
};

// Un admin con permisos limitados: NO tiene usuarios:gestionar ni auditoria:ver.
const limitedAdmin = {
  id: 'e2e-limited-admin',
  email: 'limited@noxlux.test',
  passwordHash: 'mock-argon2:limitedpass',
  fullName: 'Admin Limitado',
  isActive: true,
  roles: [{ role: { code: 'ADMIN', permissions: [{ permission: { code: 'pedidos:ver' } }] } }],
};

const users = [superAdmin, limitedAdmin];

// Simula la BD de refresh tokens para probar rotación + replay (revoca familia).
const storedTokens: Array<{
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}> = [];

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => {
      const byEmail = users.find((u) => u.email === where.email);
      const byId = users.find((u) => u.id === where.id);
      const found = where.id ? byId : byEmail;
      return found
        ? {
            ...found,
            roles: found.roles.map((r) => ({
              role: {
                ...r.role,
                permissions: r.role.permissions.map((p) => ({ permission: p.permission })),
              },
            })),
          }
        : null;
    }),
    create: jest.fn(async ({ data }: any) => ({ id: 'e2e-new', email: data.email })),
  },
  refreshToken: {
    create: jest.fn(async ({ data }: any) => {
      const row = {
        id: `rt-${storedTokens.length + 1}`,
        tokenHash: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revokedAt: null,
      };
      storedTokens.push(row);
      return row;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      return storedTokens.find((t) => t.tokenHash === where.tokenHash) ?? null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const t = storedTokens.find((s) => s.id === where.id);
      if (t) Object.assign(t, data);
      return t;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const t of storedTokens) {
        if (t.userId === where.userId && t.revokedAt === null) {
          t.revokedAt = data.revokedAt;
          count++;
        }
      }
      return { count };
    }),
  },
  auditLog: {
    create: jest.fn(async ({ data }: any) => ({ id: 'log', ...data })),
    findMany: jest.fn(async () => []),
  },
  order: { findMany: jest.fn(async () => []) },
  productImage: { findMany: jest.fn(async () => []) },
};

describe('Seguridad (e2e / NL-12)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(MEDIA_STORAGE)
      .useValue({
        save: jest.fn(),
        read: jest.fn(),
        deleteObject: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app); // MISMA config que producción (helmet/CORS/pipes/filter/rate-limit)
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body as { accessToken: string; refreshToken: string };
  };

  describe('Helmet / headers de seguridad', () => {
    it('x-content-type-options: nosniff y CSP via Content-Security-Policy en /api/health', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(String(res.headers['x-frame-options'])).toMatch(/deny|sameorigin/i);
      expect(String(res.headers['content-security-policy']).toLowerCase()).toContain(
        "default-src 'self'",
      );
    });
  });

  describe('CORS', () => {
    it('rechaza un origen no permitido (omitir allow-origin)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'http://evil.example.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('permite un origen de la allow-list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'http://trusted.example.com');
      expect(res.headers['access-control-allow-origin']).toBe('http://trusted.example.com');
    });
  });

  describe('Matriz de autorización (RBAC)', () => {
    it('ADMIN limitado → 403 en POST /api/auth/register (usuarios:gestionar)', async () => {
      const { accessToken } = await login('limited@noxlux.test', 'limitedpass');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'nuevo@noxlux.test', password: 'password-segura-123', roleCode: 'ADMIN' });
      expect(res.status).toBe(403);
      expect(res.body.message).not.toContain('clave');
    });

    it('ADMIN limitado → 403 en GET /api/audit (auditoria:ver)', async () => {
      const { accessToken } = await login('limited@noxlux.test', 'limitedpass');
      await request(app.getHttpServer())
        .get('/api/audit')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('SUPER_ADMIN → 201 en register y 200 en /api/audit', async () => {
      const { accessToken } = await login('super@noxlux.test', 'superpass');
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'nuevo-super@noxlux.test', password: 'password-segura-123', roleCode: 'ADMIN' })
        .expect(201);
      await request(app.getHttpServer())
        .get('/api/audit')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Mass-assignment / whitelist', () => {
    it('400 con forbidNonWhitelisted cuando se envían campos extra', async () => {
      const { accessToken } = await login('super@noxlux.test', 'superpass');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'x@noxlux.test',
          password: 'password-segura-123',
          roleCode: 'ADMIN',
          isAdmin: true,
        });
      expect(res.status).toBe(400);
    });
  });

  describe('Token / sesión', () => {
    it('401 sin token en un endpoint protegido', async () => {
      await request(app.getHttpServer()).get('/api/audit').expect(401);
    });

    it('401 con un access token firmado con clave inválida', async () => {
      const jwt = require('jsonwebtoken');
      const bad = jwt.sign({ sub: 'e2e-super-admin', email: 'a@b.c' }, 'clave-invalida', {
        expiresIn: 900,
      });
      await request(app.getHttpServer())
        .get('/api/audit')
        .set('Authorization', `Bearer ${bad}`)
        .expect(401);
    });

    it('refresh con reuso de un token ya rotado revoca TODA la familia y devuelve 401', async () => {
      const coins = await login('super@noxlux.test', 'superpass');
      // Primer refresh → rota el token 1 y emite uno nuevo (token 2).
      const first = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: coins.refreshToken })
        .expect(200);
      expect(first.body.refreshToken).toBeDefined();

      // Reusar el token 1 (ya revocado) es un replay: 401 y familia revocada.
      const replay = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: coins.refreshToken });
      expect(replay.status).toBe(401);
      expect(replay.body.message).toEqual(
        'Sesión revocada: se detectó el reuso de un token',
      );

      // Tras el replay incluso el token 2 (emitido antes) quedó revocado.
      const second = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: first.body.refreshToken });
      expect(second.status).toBe(401);
    });
  });

  describe('Paginación (límite acotado)', () => {
    it('200 con limit válido (100) en GET /api/orders', async () => {
      const { accessToken } = await login('limited@noxlux.test', 'limitedpass');
      await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: 100 })
        .expect(200);
    });

    it('400 si limit supera el máximo (9999)', async () => {
      const { accessToken } = await login('limited@noxlux.test', 'limitedpass');
      await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: 9999 })
        .expect(400);
    });

    it('400 si limit no es numérico (abc)', async () => {
      const { accessToken } = await login('limited@noxlux.test', 'limitedpass');
      await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: 'abc' })
        .expect(400);
    });
  });

  describe('Forma de errores (sin leaks)', () => {
    it('el body de un 401 no expone stack ni detalles internos', async () => {
      const res = await request(app.getHttpServer()).get('/api/audit').expect(401);
      expect(res.body.statusCode).toBeDefined();
      expect(res.body.message).toBeDefined();
      expect(JSON.stringify(res.body)).not.toMatch(/at Object\.|at .*node_modules/i);
    });
  });

  describe('Rate limiting (por IP @ express-rate-limit)', () => {
    it('→ 429 tras exceder el límite de intentos en /api/auth/login', async () => {
      let statuses: number[] = [];
      for (let i = 0; i < 40; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .set('Origin', 'http://trusted.example.com')
          .send({ email: `user${i}@noxlux.test`, password: 'incorrecta' });
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
    });
  });
});
