import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api/client';
import { ApiMediaRepository } from '../services/repositories/api/ApiMediaRepository';
import { setTokens, clearTokens } from '../auth/tokenStorage';

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

describe('ApiMediaRepository', () => {
  beforeEach(() => setTokens({ accessToken: ACCESS_TOKEN, refreshToken: 'refresh-token' }));
  afterEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  const uploadBody = { key: 'abc.webp', url: '/api/media/file/abc.webp', mimeType: 'image/webp', size: 7 };

  it('upload: envía FormData sin Content-Type json y mapea a ProductImage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(uploadBody, 201));
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiMediaRepository();
    const file = new File(['img'], 'foto.webp', { type: 'image/webp' });

    const result = await repo.upload(file);

    expect(result).toEqual({ id: 'abc.webp', url: '/api/media/file/abc.webp', isPrimary: false });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('upload: propaga el error del API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ message: 'El mime no es una imagen permitida' }, 400),
    );
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiMediaRepository();
    const file = new File(['x'], 'malo.txt', { type: 'text/plain' });
    await expect(repo.upload(file)).rejects.toMatchObject({ status: 400 });
    expect(repo instanceof ApiMediaRepository).toBe(true);
  });

  it('list: mapea la galería del API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse([
        { id: 'img-2', url: '/api/media/file/b.jpg', alt: 'X', isPrimary: true, productName: 'ANILLO' },
        { id: 'img-1', url: '/api/media/file/a.jpg', alt: null, isPrimary: false, productName: null },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiMediaRepository();
    const result = await repo.list();
    expect(result).toEqual([
      { id: 'img-2', url: '/api/media/file/b.jpg', alt: 'X', isPrimary: true },
      { id: 'img-1', url: '/api/media/file/a.jpg', alt: undefined, isPrimary: false },
    ]);
  });

  it('remove: DELETE la key y respeta 200', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeResponse({ key: 'abc.webp', deleted: true }));
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiMediaRepository();
    await repo.remove('abc.webp');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://localhost:3000/api/media/abc.webp`);
    expect(init.method).toBe('DELETE');
  });

  it('remove: propaga 409 cuando la imagen está en uso', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({ message: 'en uso' }, 409),
    );
    vi.stubGlobal('fetch', fetchMock);
    const repo = new ApiMediaRepository();
    await expect(repo.remove('abc.webp')).rejects.toBeInstanceOf(ApiError);
  });
});