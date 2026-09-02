import { INestApplication } from '@nestjs/common';
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

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'variant-1',
  sku: 'ANILLO-E2E-1',
  material: 'STAINLESS_STEEL',
  size: 'T18',
  status: 'active',
  product: { id: 'prod-1', name: 'ANILLO HELIOS LUX' },
  inventory: { stockOnHand: 7, reserved: 2 },
  ...overrides,
});

let currentEntry = makeEntry();

const variants = () => [
  currentEntry,
  {
    id: 'variant-empty',
    sku: 'PULSERA-EMP-1',
    material: 'RHODIUM',
    size: 'T16',
    status: 'active',
    product: { id: 'prod-2', name: 'PULSERA AURORA' },
    inventory: null,
  },
];

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id === 'e2e-user-1' || where.email === 'admin@noxlux.test') {
        return { ...adminUser };
      }
      return null;
    }),
    create: jest.fn(async ({ data }: any) => ({ id: 'e2e-user-new', email: data.email })),
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
  productVariant: {
    findMany: jest.fn(async () => variants()),
    findUnique: jest.fn(async ({ where: _where }: any) => {
      if (_where.id === 'variant-ghost') return null;
      const found = variants().find((v) => v.id === _where.id);
      return found ?? null;
    }),
  },
  inventory: {
    upsert: jest.fn(async ({ where: _where, update }: any) => {
      currentEntry = makeEntry({
        inventory: {
          stockOnHand: update.stockOnHand,
          reserved: currentEntry.inventory?.reserved ?? 0,
        },
      });
      return currentEntry.inventory;
    }),
  },
  stockMovement: {
    create: jest.fn(async ({ data }: any) => ({ id: 'mov-new', ...data })),
  },
  auditLog: {
    create: jest.fn(async ({ data }: any) => ({ id: 'audit-new', ...data })),
  },
  $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) => {
    const tx = {
      inventory: mockPrisma.inventory,
      stockMovement: mockPrisma.stockMovement,
      user: mockPrisma.user,
      auditLog: mockPrisma.auditLog,
    };
    return fn(tx);
  }),
};

describe('Inventory (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'supersecretpass' })
      .expect(200);
    return res.body.accessToken as string;
  };

  it('GET /api/inventory → 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/inventory').expect(401);
  });

  it('GET /api/inventory → 200 lista variantes con stock', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      sku: 'ANILLO-E2E-1',
      stockOnHand: 7,
      reserved: 2,
      available: 5,
    });
    expect(res.body[1]).toMatchObject({ stockOnHand: 0, available: 0 });
  });

  it('GET /api/inventory/:variantId → 404 si la variante no existe', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .get('/api/inventory/variant-ghost')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PUT /api/inventory/:variantId → 200 fija stock y registra movimiento + auditoría', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .put('/api/inventory/variant-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ stockOnHand: 12, reason: 'reposición' })
      .expect(200);
    expect(res.body.stockOnHand).toBe(12);
    expect(res.body.available).toBe(10);
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productVariantId: 'variant-1',
        type: 'set',
        delta: 5,
        stockBefore: 7,
        stockAfter: 12,
        reason: 'reposición',
      }),
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'e2e-user-1',
        action: 'inventory.set',
      }),
    });
  });

  it('POST /api/inventory/:variantId/adjust → 200 aplica delta negativo', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/inventory/variant-1/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ delta: -3 })
      .expect(200);
    expect(res.body.stockOnHand).toBe(9);
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'adjust', delta: -3, stockAfter: 9 }),
    });
  });

  it('POST /api/inventory/:variantId/adjust → 409 si el stock quedaría negativo', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/api/inventory/variant-1/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ delta: -100 })
      .expect(409);
  });

  it('PUT /api/inventory/:variantId → 400 con stock negativo', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .put('/api/inventory/variant-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ stockOnHand: -1 })
      .expect(400);
  });

  it('POST /api/inventory/:variantId/adjust → 400 con delta 0', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/api/inventory/variant-1/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ delta: 0 })
      .expect(400);
  });

  it('PUT /api/inventory/:variantId → 404 si la variante no existe', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .put('/api/inventory/variant-ghost')
      .set('Authorization', `Bearer ${token}`)
      .send({ stockOnHand: 3 })
      .expect(404);
  });
});