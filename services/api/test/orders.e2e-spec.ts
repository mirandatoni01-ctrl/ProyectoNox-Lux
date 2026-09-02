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

const ACTIVE_VARIANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const makeVariant = (overrides: Record<string, unknown> = {}) => ({
  id: ACTIVE_VARIANT,
  sku: 'ANILLO-E2E-1',
  material: 'STAINLESS_STEEL',
  size: 'T18',
  status: 'active',
  product: { id: 'prod-1', name: 'ANILLO HELIOS LUX', basePrice: 45, isActive: true },
  inventory: { stockOnHand: 7, reserved: 2 },
  ...overrides,
});

const variantById = (id: string) => {
  if (id === '00000000-0000-4000-8000-000000000000') return null;
  if (id === '11111111-1111-4111-8111-111111111111') {
    return makeVariant({ id, sku: 'ANILLO-HIDDEN-1', status: 'hidden' });
  }
  if (id === '22222222-2222-4222-8222-222222222222') {
    return makeVariant({
      id,
      sku: 'PULSERA-AGOT-1',
      product: { id: 'prod-2', name: 'PULSERA AURORA', basePrice: 30, isActive: true },
      inventory: { stockOnHand: 0, reserved: 0 },
    });
  }
  return makeVariant();
};

const makeOrderDetail = (id: string, status: string, overrides: Record<string, unknown> = {}) => ({
  id,
  status,
  totalAmount: 90,
  whatsappPhone: '573001234567',
  source: 'store',
  customer: { id: 'cust-2', name: 'E2E Cliente', phone: '573001234567' },
  items: [
    {
      id: 'oi-1',
      orderId: id,
      productVariantId: ACTIVE_VARIANT,
      quantity: 2,
      unitPrice: 45,
      lineTotal: 90,
      productVariant: {
        id: ACTIVE_VARIANT,
        material: 'STAINLESS_STEEL',
        size: 'T18',
        inventory: { stockOnHand: 7 },
        product: { id: 'prod-1', name: 'ANILLO HELIOS LUX', images: [] },
      },
    },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const createdOrders: any[] = [];

const findOrder = (id: string) => createdOrders.find((o) => o.id === id) ?? null;

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
    findUnique: jest.fn(async ({ where }: any) => variantById(where.id)),
  },
  customer: {
    findFirst: jest.fn(async () => null),
    update: jest.fn(async (args: any) => ({ id: 'cust-1', ...args.data })),
    create: jest.fn(async ({ data }: any) => ({ id: 'cust-2', ...data })),
  },
  order: {
    create: jest.fn(async ({ data }: any) => {
      const id = `e2e-order-${createdOrders.length + 1}`;
      const order = makeOrderDetail(id, data.status, { whatsappPhone: data.whatsappPhone });
      createdOrders.push(order);
      return order;
    }),
    findMany: jest.fn(async ({ where, orderBy: _o }: any) => {
      if (where.status) return createdOrders.filter((o) => o.status === where.status);
      return [...createdOrders];
    }),
    findUnique: jest.fn(async ({ where }: any) => findOrder(where.id)),
    findUniqueOrThrow: jest.fn(async ({ where }: any) => findOrder(where.id)),
    update: jest.fn(async ({ where, data }: any) => {
      const order = findOrder(where.id);
      if (order) Object.assign(order, data);
      return order;
    }),
  },
  inventory: {
    update: jest.fn(async (args: any) => {
      return { productVariantId: args.where.productVariantId, ...args.data };
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
      customer: mockPrisma.customer,
      order: mockPrisma.order,
      inventory: mockPrisma.inventory,
      stockMovement: mockPrisma.stockMovement,
      user: mockPrisma.user,
      auditLog: mockPrisma.auditLog,
    };
    return fn(tx);
  }),
};

describe('Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    createdOrders.length = 0;
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

  const createOrderBody = {
    name: 'E2E Cliente',
    whatsappPhone: '573001234567',
    items: [{ productVariantId: ACTIVE_VARIANT, quantity: 2 }],
  };

  it('POST /api/orders → 201 crea pedido pending (anónimo), reserva stock, ledger y WhatsApp link', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .send(createOrderBody)
      .expect(201);

    expect(res.body).toMatchObject({
      status: 'pending',
      totalAmount: 90,
      whatsappPhone: '573001234567',
      customer: { name: 'E2E Cliente', phone: '573001234567' },
    });
    expect(res.body.items[0]).toMatchObject({
      productVariantId: ACTIVE_VARIANT,
      quantity: 2,
      unitPrice: 45,
      lineTotal: 90,
      name: 'ANILLO HELIOS LUX',
    });
    expect(res.body.whatsappLink).toMatch(/^https:\/\/wa\.me\//);

    expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
      where: { productVariantId: ACTIVE_VARIANT },
      data: { reserved: { increment: 2 } },
    });
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productVariantId: ACTIVE_VARIANT,
        type: 'reserve',
        refType: 'order',
        refId: 'e2e-order-1',
      }),
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'order.create', entity: 'order' }),
    });
    expect(mockPrisma.customer.create).toHaveBeenCalledWith({
      data: { name: 'E2E Cliente', phone: '573001234567' },
    });
  });

  it('POST /api/orders → 400 con body inválido (sin items)', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({ name: 'X', whatsappPhone: '573001234567', items: [] })
      .expect(400);
  });

  it('POST /api/orders → 400 con teléfono inválido', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({ name: 'X', whatsappPhone: 'abc', items: [{ productVariantId: ACTIVE_VARIANT, quantity: 1 }] })
      .expect(400);
  });

  it('POST /api/orders → 404 si la variante no existe', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        name: 'X',
        whatsappPhone: '573001234567',
        items: [{ productVariantId: '00000000-0000-4000-8000-000000000000', quantity: 1 }],
      })
      .expect(404);
  });

  it('POST /api/orders → 409 si la variante no está activa', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        name: 'X',
        whatsappPhone: '573001234567',
        items: [{ productVariantId: '11111111-1111-4111-8111-111111111111', quantity: 1 }],
      })
      .expect(409);
  });

  it('POST /api/orders → 409 por no-sobreventa (stock disponible 0)', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        name: 'X',
        whatsappPhone: '573001234567',
        items: [{ productVariantId: '22222222-2222-4222-8222-222222222222', quantity: 1 }],
      })
      .expect(409);
  });

  it('GET /api/orders → 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/orders').expect(401);
  });

  it('GET /api/orders → 200 listado admin con filtro de estado', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .get('/api/orders?status=pending')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({ status: 'pending', totalAmount: 90 });
  });

  it('GET /api/orders/:id → 200 detalle con items', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .get('/api/orders/e2e-order-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.id).toBe('e2e-order-1');
    expect(res.body.items).toHaveLength(1);
  });

  it('GET /api/orders/:id → 404 si no existe', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .get('/api/orders/e2e-order-ghost')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PATCH /api/orders/:id/status → 401 sin token', async () => {
    await request(app.getHttpServer())
      .patch('/api/orders/e2e-order-1/status')
      .send({ status: 'confirmed' })
      .expect(401);
  });

  it('PATCH /api/orders/:id/status → 200 pending → confirmed (sin tocar stock)', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .patch('/api/orders/e2e-order-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(200);
    expect(res.body.status).toBe('confirmed');
    const lastMovement = mockPrisma.stockMovement.create.mock.calls.at(-1)?.[0].data.type;
    expect(lastMovement).toBe('reserve'); // no se registra release/consume
  });

  it('PATCH /api/orders/:id/status → 200 confirmed → completed (consume stock)', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .patch('/api/orders/e2e-order-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' })
      .expect(200);
    expect(mockPrisma.inventory.update).toHaveBeenLastCalledWith({
      where: { productVariantId: ACTIVE_VARIANT },
      data: { stockOnHand: { decrement: 2 }, reserved: { decrement: 2 } },
    });
  });

  it('PATCH /api/orders/:id/status → 400 para transición inválida (terminal)', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .patch('/api/orders/e2e-order-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(400);
  });

  it('PATCH /api/orders/:id/status → 404 si el pedido no existe', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .patch('/api/orders/e2e-order-ghost/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(404);
  });

  it('PATCH /api/orders/:id/status → 200 pending → cancelled (liberar reserva)', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({ ...createOrderBody, whatsappPhone: '573009999999' })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/orders/e2e-order-2/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' })
      .expect(200);
    expect(mockPrisma.inventory.update).toHaveBeenLastCalledWith({
      where: { productVariantId: ACTIVE_VARIANT },
      data: { reserved: { decrement: 2 } },
    });
    expect(mockPrisma.stockMovement.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        type: 'release',
        delta: -2,
        refType: 'order',
        refId: 'e2e-order-2',
      }),
    });
  });
});