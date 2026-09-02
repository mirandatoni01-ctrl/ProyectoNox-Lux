import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

process.env.JWT_ACCESS_SECRET = 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
process.env.JWT_ACCESS_TTL = '900';
process.env.JWT_REFRESH_TTL = '604800';

const adminUser = {
  id: 'e2e-user-1',
  email: 'admin@noxlux.test',
  passwordHash: 'mock-argon2:supersecretpass',
  fullName: 'Admin',
  isActive: true,
  roles: [
    {
      role: {
        code: 'SUPER_ADMIN',
        permissions: [{ permission: { code: '*' } }],
      },
    },
  ],
};

const storedTokens: any[] = [];

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.email === 'admin@noxlux.test' || where.id === 'e2e-user-1') {
        return { ...adminUser };
      }
      return null;
    }),
    create: jest.fn(async ({ data }: any) => ({
      id: 'e2e-user-new',
      email: data.email,
    })),
  },
  refreshToken: {
    create: jest.fn(async (args: any) => {
      const row = {
        id: `e2e-rt-${storedTokens.length + 1}`,
        tokenHash: args.data.tokenHash,
        userId: args.data.userId,
        expiresAt: args.data.expiresAt,
        revokedAt: null,
      };
      storedTokens.push(row);
      return row;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      return storedTokens.find((t) => t.tokenHash === where.tokenHash) ?? null;
    }),
    update: jest.fn(async (args: any) => {
      const t = storedTokens.find((s) => s.id === args.where.id);
      if (t) Object.assign(t, args.data);
      return t;
    }),
    updateMany: jest.fn(async (args: any) => {
      let count = 0;
      for (const t of storedTokens) {
        if (t.tokenHash === args.where.tokenHash && t.revokedAt === null) {
          t.revokedAt = args.data.revokedAt;
          count++;
        }
      }
      return { count };
    }),
  },
};

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login → 200 con accessToken y refreshToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'supersecretpass' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('POST /api/auth/login → 401 con credenciales inválidas', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'mala' })
      .expect(401);
  });

  it('GET /api/auth/me → 200 y perfil del usuario autenticado', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'supersecretpass' })
      .expect(200);
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(res.body.email).toBe('admin@noxlux.test');
    expect(res.body.id).toBe(adminUser.id);
    expect(res.body.roles).toContain('SUPER_ADMIN');
    expect(res.body.permissions).toContain('*');
  });

  it('GET /api/auth/me → 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('POST /api/auth/refresh → 200 con rotación del refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'supersecretpass' })
      .expect(200);
    const before = storedTokens.length;
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(storedTokens.length).toBe(before + 1);
  });

  it('reutilizar un refresh token ya rotado → 401', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'supersecretpass' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: login.body.refreshToken })
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  });
});