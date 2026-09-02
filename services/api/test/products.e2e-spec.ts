import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Prisma } from '@prisma/client';
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

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'e2e-product-1',
  name: 'ANILLO HELIOS LUX',
  slug: 'anillo-helios-lux',
  category: 'anillos',
  description: 'anillo de plata',
  isActive: true,
  basePrice: 25,
  materialDefault: 'STAINLESS_STEEL',
  images: [
    {
      id: 'img-1',
      url: 'https://img/test.jpg',
      alt: 'ANILLO HELIOS LUX',
      position: 0,
      isPrimary: true,
    },
  ],
  variants: [
    {
      id: 'variant-1',
      sku: 'ANILLO-E2E-1',
      material: 'STAINLESS_STEEL',
      size: 'T18',
      priceOverride: null,
      status: 'active',
      inventory: { stockOnHand: 7, reserved: 2 },
    },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

let currentRow = makeRow();

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
  product: {
    findMany: jest.fn(async ({ where }: any) => {
      if (where?.isActive === true) return [makeRow()];
      return [makeRow(), makeRow({ id: 'e2e-product-2', isActive: false })];
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id === 'e2e-product-ghost') return null;
      if (where.id === 'e2e-product-locked') return makeRow({ isActive: false });
      if (where.id === 'e2e-product-1') return currentRow;
      return null;
    }),
    create: jest.fn(async ({ data }: any) => {
      currentRow = makeRow({
        id: 'e2e-product-created',
        name: data.name,
        slug: data.slug,
        category: data.category,
        basePrice: data.basePrice,
        materialDefault: data.materialDefault,
      });
      return { id: currentRow.id, name: currentRow.name, slug: currentRow.slug };
    }),
    findUniqueOrThrow: jest.fn(async () => currentRow),
    update: jest.fn(async ({ data }: any) => {
      currentRow = makeRow({ ...currentRow, ...data });
      return currentRow;
    }),
    delete: jest.fn(async ({ where }: any) => {
      if (where.id === 'e2e-product-1') return makeRow({ id: where.id });
      throw new Prisma.PrismaClientKnownRequestError('no encontrado', {
        code: 'P2025',
        clientVersion: 'test',
      });
    }),
  },
  productVariant: {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: 'variant-created', ...data };
      return { id: row.id, ...data };
    }),
  },
  productImage: {
    create: jest.fn(async ({ data }: any) => ({ id: 'img-new', ...data })),
    findFirst: jest.fn(async () => makeRow().images[0]),
    findUnique: jest.fn(async () => makeRow().images[0]),
    update: jest.fn(async ({ data }: any) => ({ id: 'img-1', ...data })),
    delete: jest.fn(async ({ where }: any) => ({ id: where.id, deleted: true })),
    findMany: jest.fn(async () => makeRow().images),
    deleteMany: jest.fn(async () => ({ count: 1 })),
  },
  inventory: {
    create: jest.fn(async ({ data }: any) => ({ id: 'inv-new', ...data })),
  },
  stockMovement: {
    create: jest.fn(async ({ data }: any) => ({ id: 'mov-new', ...data })),
  },
  $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) => {
    const tx = {
      product: mockPrisma.product,
      productVariant: mockPrisma.productVariant,
      productImage: mockPrisma.productImage,
      inventory: mockPrisma.inventory,
      stockMovement: mockPrisma.stockMovement,
    };
    return fn(tx);
  }),
};

describe('Products (e2e)', () => {
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

  const login = async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'supersecretpass' })
      .expect(200);
    return res.body.accessToken as string;
  };

  it('GET /api/products/catalog → 200 público con solo productos activos', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products/catalog')
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('ANILLO HELIOS LUX');
    expect(res.body[0].variants[0].stock).toBe(7);
  });

  it('GET /api/products → 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/products').expect(401);
  });

  it('GET /api/products → 200 con token (incluye inactivos)', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(2);
  });

  it('GET /api/products/:id → 404 si no existe', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .get('/api/products/e2e-product-ghost')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('POST /api/products → 201 crea el producto', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'ANILLO NUEVO',
        category: 'pulseras',
        description: 'ok',
        basePrice: 12,
        materialDefault: 'RHODIUM',
        variants: [
          { material: 'RHODIUM', size: 'T18', priceOverride: 12 },
        ],
      })
      .expect(201);
    expect(res.body.slug).toBe('anillo-nuevo');
    expect(res.body.variants).toHaveLength(1);
  });

  it('POST /api/products → 400 si el material no es válido', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'INVALIDO',
        category: 'anillos',
        basePrice: 1,
        materialDefault: 'LATON',
        variants: [{ material: 'LATON', size: 'T18' }],
      })
      .expect(400);
  });

  it('POST /api/products → 201 acepta images[] con primaria', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'ANILLO GALERIA',
        category: 'anillos',
        description: 'ok',
        basePrice: 15,
        materialDefault: 'COVERGOLD',
        images: [
          { url: '/api/media/file/a.webp' },
          { url: '/api/media/file/b.webp', isPrimary: true },
        ],
        variants: [{ material: 'COVERGOLD', size: 'T19', priceOverride: 15 }],
      })
      .expect(201);
    expect(res.body.images).toHaveLength(1);
    expect(res.body.images[0].url).toBe('https://img/test.jpg');
  });

  it('DELETE /api/products/:id/images/:imageId → 200 elimina la imagen', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .delete('/api/products/e2e-product-1/images/img-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({ id: 'img-1', deleted: true });
  });

  it('PATCH /api/products/:id → 200 reemplaza variantes', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .patch('/api/products/e2e-product-1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        basePrice: 30,
        variants: [
          { material: 'STAINLESS_STEEL', size: 'T18', priceOverride: 30 },
        ],
      })
      .expect(200);
    expect(res.body.basePrice).toBe(30);
    expect(mockPrisma.productVariant.deleteMany).toHaveBeenCalled();
  });

  it('POST /api/products/:id/toggle → 200 invierte isActive', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/products/e2e-product-locked/toggle')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.isActive).toBe(true);
  });

  it('DELETE /api/products/:id → 200 y luego 404 si no existe', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .delete('/api/products/e2e-product-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const err = new Prisma.PrismaClientKnownRequestError('no encontrado', {
      code: 'P2025',
      clientVersion: 'test',
    });
    mockPrisma.product.delete.mockRejectedValueOnce(err);
    await request(app.getHttpServer())
      .delete('/api/products/e2e-product-ghost')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});