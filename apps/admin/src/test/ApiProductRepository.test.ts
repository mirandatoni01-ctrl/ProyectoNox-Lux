import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api/client';
import { ApiProductRepository } from '../services/repositories/api/ApiProductRepository';
import {
  type ApiProduct,
  fromApiProduct,
  toApiCreateProduct,
} from '../services/repositories/api/mappers';
import { setTokens, clearTokens } from '../auth/tokenStorage';
import type { Product } from '../types';

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    async text() {
      return JSON.stringify(body);
    },
  } as Response;
}

const ACCESS_TOKEN = 'ACCESS-TOKEN';

const apiProduct: ApiProduct = {
  id: 'p-1',
  name: 'ANILLO HELIOS LUX',
  slug: 'anillo-helios-lux',
  category: 'anillos',
  description: 'anillo de plata',
  isActive: true,
  basePrice: 25,
  materialDefault: 'STAINLESS_STEEL',
  imageUrl: 'https://img/1.jpg',
  images: [],
  variants: [
    {
      id: 'v-1',
      sku: 'ANILLO-AAAA-1',
      material: 'STAINLESS_STEEL',
      size: 'T18',
      priceOverride: null,
      status: 'active',
      stock: 7,
      reserved: 2,
    },
  ],
};

const adminProduct: Product = {
  id: 'p-1',
  name: 'ANILLO HELIOS LUX',
  category: 'anillos',
  basePrice: 25,
  material: 'STAINLESS_STEEL',
  description: 'anillo de plata',
  isActive: true,
  imageUrl: 'https://img/1.jpg',
  variants: [
    { material: 'STAINLESS_STEEL', size: 'T18', stock: 7, priceOverride: 25 },
  ],
};

describe('ApiProductRepository', () => {
  let repo: ApiProductRepository;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = new ApiProductRepository();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setTokens({ accessToken: ACCESS_TOKEN, refreshToken: 'R' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
  });

  it('getAll: GET /api/products con Bearer y mapea la respuesta', async () => {
    fetchMock.mockResolvedValue(makeResponse([apiProduct, { ...apiProduct, id: 'p-2' }]));
    const products = await repo.getAll();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/products',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    );
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      id: 'p-1',
      name: 'ANILLO HELIOS LUX',
      material: 'STAINLESS_STEEL',
    });
    expect(products[0].variants[0].stock).toBe(7);
  });

  it('getById: 200 devuelve el producto y 404 undefined', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(apiProduct));
    expect((await repo.getById('p-1'))?.name).toBe('ANILLO HELIOS LUX');

    fetchMock.mockResolvedValueOnce(makeResponse({ message: 'Producto no encontrado' }, 404));
    expect(await repo.getById('ghost')).toBeUndefined();
  });

  it('create: POST /api/products con stock y materialDefault', async () => {
    fetchMock.mockResolvedValue(makeResponse(apiProduct, 201));
    await repo.create(adminProduct);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect((init as RequestInit).method).toBe('POST');
    expect(body).toMatchObject({
      name: 'ANILLO HELIOS LUX',
      materialDefault: 'STAINLESS_STEEL',
      imageUrl: 'https://img/1.jpg',
    });
    expect(body.variants).toEqual([
      { material: 'STAINLESS_STEEL', size: 'T18', priceOverride: 25, stock: 7 },
    ]);
  });

  it('update: PATCH /api/products/:id con reemplazo de variantes', async () => {
    fetchMock.mockResolvedValue(makeResponse(apiProduct));
    await repo.update({ ...adminProduct, basePrice: 30 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/products/p-1');
    const body = JSON.parse((init as RequestInit).body as string);
    expect((init as RequestInit).method).toBe('PATCH');
    expect(body.basePrice).toBe(30);
  });

  it('toggleActive: POST :id/toggle y devuelve el producto actualizado', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ...apiProduct, isActive: false }));
    const updated = await repo.toggleActive('p-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/products/p-1/toggle',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(updated?.isActive).toBe(false);
  });

  it('toggleActive: 404 devuelve undefined', async () => {
    fetchMock.mockResolvedValue(makeResponse({ message: 'Producto no encontrado' }, 404));
    expect(await repo.toggleActive('ghost')).toBeUndefined();
  });

  it('propaga los errores del servidor como ApiError', async () => {
    fetchMock.mockResolvedValue(makeResponse({ message: 'Ya existe el slug' }, 409));
    const error = await repo.create(adminProduct).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.status).toBe(409);
      expect(error.message).toBe('Ya existe el slug');
    }
  });

  it('removeImage: DELETE /api/products/:id/images/:imageId', async () => {
    fetchMock.mockResolvedValue(makeResponse({ id: 'img-1', deleted: true }));
    await repo.removeImage('p-1', 'img-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/products/p-1/images/img-1');
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('descarta el token si no hay sesión activa', async () => {
    clearTokens();
    fetchMock.mockResolvedValue(makeResponse([apiProduct]));
    await repo.getAll();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });
});

describe('mappers', () => {
  it('toApiCreateProduct mapea material, incluye stock y omite id', () => {
    const dto = toApiCreateProduct(adminProduct);
    expect(dto).toMatchObject({
      materialDefault: 'STAINLESS_STEEL',
      category: 'anillos',
      isActive: true,
    });
    expect(dto).not.toHaveProperty('id');
    expect(dto.variants[0]).toEqual({
      material: 'STAINLESS_STEEL',
      size: 'T18',
      priceOverride: 25,
      stock: 7,
    });
  });

  it('fromApiProduct usa basePrice como priceOverride null y cadena vacía sin imagen', () => {
    const dto = { ...apiProduct, imageUrl: null, variants: [{ ...apiProduct.variants[0], priceOverride: null }] };
    const product = fromApiProduct(dto);
    expect(product.imageUrl).toBe('');
    expect(product.variants[0].priceOverride).toBe(25);
    expect(product.variants[0].stock).toBe(7);
  });

  it('toApiCreateProduct envía images[] con la primaria y fromApiProduct la restaura', () => {
    const withImages: Product = {
      ...adminProduct,
      imageUrl: '/api/media/file/b.webp',
      images: [
        { id: 'img-1', url: '/api/media/file/a.jpg', position: 0 },
        { id: 'img-2', url: '/api/media/file/b.webp', position: 1, isPrimary: true },
      ],
    };
    const dto = toApiCreateProduct(withImages);
    expect(dto.images).toEqual([
      { id: 'img-1', url: '/api/media/file/a.jpg', alt: undefined, position: 0, isPrimary: undefined },
      { id: 'img-2', url: '/api/media/file/b.webp', alt: undefined, position: 1, isPrimary: true },
    ]);
    const product = fromApiProduct({ ...apiProduct, imageUrl: null, images: dto.images! });
    expect(product.images).toHaveLength(2);
    expect(product.imageUrl).toBe('/api/media/file/a.jpg');
    expect(product.images![1].isPrimary).toBe(true);
  });

  it('fromApiProduct usa la primaria como imageUrl cuando no hay legacy', () => {
    const dto = {
      ...apiProduct,
      imageUrl: null,
      images: [
        { id: 'img-2', url: '/api/media/file/b.webp', position: 1, isPrimary: true },
      ],
    };
    expect(fromApiProduct(dto).imageUrl).toBe('/api/media/file/b.webp');
  });
});