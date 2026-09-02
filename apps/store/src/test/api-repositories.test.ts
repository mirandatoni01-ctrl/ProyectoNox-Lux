import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiProductRepository } from '../services/repositories/api/ApiProductRepository';
import { ApiOrderRepository } from '../services/repositories/api/ApiOrderRepository';
import { CachedProductRepository } from '../services/repositories/CachedProductRepository';
import { LocalProductRepository } from '../services/repositories/local/LocalProductRepository';
import { ApiError } from '../services/api/client';
import type { ApiOrder, ApiProduct } from '../services/repositories/api/mappers';
import type { CreateOrderInput } from '../services/repositories/types';

type JsonResponse = { status: number; payload: unknown };

const jsonResponse = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: async () => JSON.stringify(payload),
  }) as unknown as Response;

function stubFetch(handler: (url: string, init?: RequestInit) => JsonResponse) {
  const fn = vi.fn((url: string, init?: RequestInit) => {
    const res = handler(url, init);
    return jsonResponse(res.status, res.payload);
  });
  globalThis.fetch = fn as unknown as typeof fetch;
}

const makeApiProduct = (overrides: Partial<ApiProduct> = {}): ApiProduct => ({
  id: 'prod-1',
  name: 'ANILLO TEST',
  slug: 'anillo-test',
  category: 'anillos',
  description: 'Producto real.',
  isActive: true,
  basePrice: 100,
  materialDefault: 'COVERGOLD',
  imageUrl: '/api/media/file/img.jpg',
  images: [],
  variants: [
    {
      id: 'var-1',
      sku: 'ANILLO-HELIOS-01',
      material: 'COVERGOLD',
      size: 'Talla 6',
      priceOverride: null,
      status: 'ACTIVE',
      stock: 12,
      reserved: 3,
    },
  ],
  ...overrides,
});

const makeApiOrder = (overrides: Partial<ApiOrder> = {}): ApiOrder => ({
  id: 'order-1',
  status: 'pending',
  totalAmount: 100,
  whatsappPhone: '573001234567',
  source: 'STORE',
  customer: { name: 'Cliente', phone: '573001234567' },
  items: [
    {
      id: 'line-1',
      productVariantId: 'var-1',
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      name: 'ANILLO TEST',
      material: 'COVERGOLD',
      size: 'Talla 6',
      imageUrl: null,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  whatsappLink: 'https://wa.me/573001111111?text=Hola',
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ApiProductRepository (NL-11)', () => {
  const repo = new ApiProductRepository();

  it('mapea el catálogo público (variante con id + reserved, URL media absoluta)', async () => {
    stubFetch(() => ({ status: 200, payload: [makeApiProduct()] }));
    const products = await repo.listActive();
    expect(products).toHaveLength(1);
    const p = products[0];
    expect(p.imageUrl).toBe('http://localhost:3000/api/media/file/img.jpg');
    expect(p.variants[0]).toMatchObject({
      id: 'var-1',
      sku: 'ANILLO-HELIOS-01',
      material: 'COVERGOLD',
      size: 'Talla 6',
      stock: 12,
      reserved: 3,
      priceOverride: 100,
      status: 'ACTIVE',
    });
  });

  it('propaga ApiError con status 0 si la red falla', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(repo.listActive()).rejects.toMatchObject({ status: 0 });
  });

  it('propaga el status HTTP real (p. ej. 500), sin usar la caché', async () => {
    stubFetch(() => ({ status: 500, payload: { message: 'Internal' } }));
    await expect(repo.listActive()).rejects.toMatchObject({ status: 500 });
  });
});

describe('CachedProductRepository (offline, NL-11)', () => {
  const remote = new ApiProductRepository();
  const cache = new LocalProductRepository();
  const repo = new CachedProductRepository(remote, cache);

  it('online: devuelve de la API y refresca la caché (fromCache=false)', async () => {
    stubFetch(() => ({ status: 200, payload: [makeApiProduct()] }));
    const result = await repo.listActive();
    expect(result.fromCache).toBe(false);
    expect(result.products).toHaveLength(1);
    const cached = await cache.listActive();
    expect(cached.products).toHaveLength(1);
  });

  it('red caída: sirve la caché last-known-good (fromCache=true)', async () => {
    await cache.saveCatalog([
      {
        id: 'prod-1',
        name: 'ANILLO TEST',
        category: 'anillos',
        basePrice: 100,
        material: 'COVERGOLD',
        description: 'x',
        isActive: true,
        imageUrl: 'http://localhost:3000/api/media/file/img.jpg',
        variants: [
          { id: 'var-1', material: 'COVERGOLD', size: 'Talla 6', stock: 12, reserved: 3, priceOverride: 100 },
        ],
      },
    ]);
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const result = await repo.listActive();
    expect(result.fromCache).toBe(true);
    expect(result.products).toHaveLength(1);
  });

  it('error HTTP real (500) se propaga y NO se enmascara como offline', async () => {
    stubFetch(() => ({ status: 500, payload: { message: 'Internal' } }));
    await expect(repo.listActive()).rejects.toMatchObject({ status: 500 });
  });
});

describe('ApiOrderRepository (NL-11)', () => {
  const repo = new ApiOrderRepository();
  const draft: CreateOrderInput = {
    name: 'Cliente',
    whatsappPhone: '573001234567',
    items: [{ productVariantId: 'var-1', quantity: 1 }],
  };

  it('crea el pedido (POST /api/orders) y expone total + whatsappLink del servidor', async () => {
    stubFetch((url, init) => {
      expect(url).toBe('http://localhost:3000/api/orders');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual(draft);
      return { status: 201, payload: makeApiOrder() };
    });
    const order = await repo.create(draft);
    expect(order.totalAmount).toBe(100);
    expect(order.whatsappLink).toBe('https://wa.me/573001111111?text=Hola');
    expect(order.items[0].productVariantId).toBe('var-1');
  });

  it('propaga 409 (conflicto de stock) para mostrar banner', async () => {
    stubFetch(() => ({ status: 409, payload: { message: 'Stock insuficiente' } }));
    await expect(repo.create(draft)).rejects.toMatchObject({ status: 409 });
  });

  it('propaga 400 (validación Zod) con el mensaje de error', async () => {
    stubFetch(() => ({
      status: 400,
      payload: { message: [{ path: 'whatsappPhone', message: 'Invalid' }] },
    }));
    await expect(repo.create(draft)).rejects.toMatchObject({
      status: 400,
      message: 'whatsappPhone: Invalid',
    });
  });

  it('red caída: ApiError status 0 para ofrecer reintento/fallback', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(repo.create(draft)).rejects.toBeInstanceOf(ApiError);
    await expect(repo.create(draft)).rejects.toMatchObject({ status: 0 });
  });
});