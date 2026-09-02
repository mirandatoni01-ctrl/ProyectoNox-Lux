import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api/client';
import { ApiInventoryRepository } from '../services/repositories/api/ApiInventoryRepository';
import type { ApiStockEntry } from '../services/repositories/api/ApiInventoryRepository';
import { setTokens, clearTokens } from '../auth/tokenStorage';
import type { StockEntry } from '../types';

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

const apiEntry: ApiStockEntry = {
  productVariantId: 'variant-1',
  sku: 'ANILLO-AAAA-1',
  productId: 'p-1',
  productName: 'ANILLO HELIOS LUX',
  material: 'STAINLESS_STEEL',
  size: 'T18',
  status: 'active',
  stockOnHand: 7,
  reserved: 2,
  available: 5,
};

describe('ApiInventoryRepository', () => {
  let repo: ApiInventoryRepository;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = new ApiInventoryRepository();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setTokens({ accessToken: ACCESS_TOKEN, refreshToken: 'R' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
  });

  it('list: GET /api/inventory con Bearer y mapea las entradas', async () => {
    fetchMock.mockResolvedValue(
      makeResponse([apiEntry, { ...apiEntry, productVariantId: 'variant-2', stockOnHand: 0, available: 0 }]),
    );
    const entries = await repo.list();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/inventory',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
      }),
    );
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      productVariantId: 'variant-1',
      sku: 'ANILLO-AAAA-1',
      productName: 'ANILLO HELIOS LUX',
      stockOnHand: 7,
      available: 5,
    });
  });

  it('setStock: PUT /api/inventory/:id con stockOnHand y motivo', async () => {
    fetchMock.mockResolvedValue(makeResponse({ ...apiEntry, stockOnHand: 12, available: 10 }));
    const updated: StockEntry = await repo.setStock('variant-1', 12, 'reposición');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/inventory/variant-1');
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      stockOnHand: 12,
      reason: 'reposición',
    });
    expect(updated.stockOnHand).toBe(12);
    expect(updated.available).toBe(10);
  });

  it('setStock: omite el motivo si no se provee', async () => {
    fetchMock.mockResolvedValue(makeResponse(apiEntry));
    await repo.setStock('variant-1', 7);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ stockOnHand: 7 });
  });

  it('adjustStock: POST a :id/adjust con delta', async () => {
    fetchMock.mockResolvedValue(makeResponse({ ...apiEntry, stockOnHand: 10, available: 8 }));
    const updated = await repo.adjustStock('variant-1', 3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/inventory/variant-1/adjust');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ delta: 3 });
    expect(updated.stockOnHand).toBe(10);
  });

  it('propaga los errores del servidor como ApiError', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ message: 'El stock de la variante no puede quedar negativo' }, 409),
    );
    const error = await repo.adjustStock('variant-1', -100).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.status).toBe(409);
      expect(error.message).toContain('negativo');
    }
  });

  it('descarta el token si no hay sesión activa', async () => {
    clearTokens();
    fetchMock.mockResolvedValue(makeResponse([apiEntry]));
    await repo.list();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });
});