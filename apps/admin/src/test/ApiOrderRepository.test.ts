import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api/client';
import { ApiOrderRepository } from '../services/repositories/api/ApiOrderRepository';
import { setTokens, clearTokens } from '../auth/tokenStorage';
import type { Order } from '../types';

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

const apiOrder = {
  id: 'order-1',
  status: 'pending',
  totalAmount: 90,
  whatsappPhone: '573001234567',
  source: 'store',
  customer: { id: 'cust-1', name: 'Juan Pérez', phone: '573001234567' },
  items: [
    {
      id: 'oi-1',
      productVariantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      quantity: 2,
      unitPrice: 45,
      lineTotal: 90,
      name: 'ANILLO HELIOS LUX',
      material: 'STAINLESS_STEEL',
      size: 'T18',
      imageUrl: null,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const expectedOrder: Order = {
  id: 'order-1',
  status: 'pending',
  totalAmount: 90,
  whatsappPhone: '573001234567',
  source: 'store',
  customer: { id: 'cust-1', name: 'Juan Pérez', phone: '573001234567' },
  items: [
    {
      id: 'oi-1',
      productVariantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      quantity: 2,
      unitPrice: 45,
      lineTotal: 90,
      name: 'ANILLO HELIOS LUX',
      material: 'STAINLESS_STEEL',
      size: 'T18',
      imageUrl: null,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ApiOrderRepository', () => {
  beforeEach(() => setTokens({ accessToken: ACCESS_TOKEN, refreshToken: 'refresh-token' }));
  afterEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it('list: GET /api/orders con Bearer y mapea a Order', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([apiOrder]));
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiOrderRepository();
    const result = await repo.list();
    expect(result).toEqual([expectedOrder]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/orders');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('list(status): añade el filtro ?status=', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiOrderRepository();
    await repo.list('pending');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/orders?status=pending');
  });

  it('list: propaga el error del API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ message: 'forbidden' }, 403));
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiOrderRepository();
    await expect(repo.list()).rejects.toBeInstanceOf(ApiError);
  });

  it('getById: GET /api/orders/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(apiOrder));
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiOrderRepository();
    const result = await repo.getById('order-1');
    expect(result).toEqual(expectedOrder);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/orders/order-1');
  });

  it('updateStatus: PATCH /api/orders/:id/status con body JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ ...apiOrder, status: 'confirmed' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiOrderRepository();
    const result = await repo.updateStatus('order-1', 'confirmed');
    expect(result.status).toBe('confirmed');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/orders/order-1/status');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ status: 'confirmed' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('updateStatus: propaga 409 por transición inválida', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ message: 'Transición inválida' }, 409),
    );
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiOrderRepository();
    await expect(repo.updateStatus('order-1', 'completed')).rejects.toBeInstanceOf(ApiError);
  });
});