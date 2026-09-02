import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiAuthRepository, ApiError } from '../auth/ApiAuthRepository';

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

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvIiwiaWF0IjoxfQ.sig';

describe('ApiAuthRepository', () => {
  let repo: ApiAuthRepository;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = new ApiAuthRepository();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login: POST /api/auth/login y devuelve el par de tokens', async () => {
    fetchMock.mockResolvedValue(makeResponse({ accessToken: 'ACCESS', refreshToken: 'REFRESH' }));

    const pair = await repo.login('admin@noxlux.test', 'secret');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'admin@noxlux.test', password: 'secret' }),
      }),
    );
    expect(pair).toEqual({ accessToken: 'ACCESS', refreshToken: 'REFRESH' });
  });

  it('me: GET /api/auth/me con Bearer y resuelve el perfil con roles', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ id: 'u1', email: 'a@b.co', roles: ['SUPER_ADMIN'], permissions: ['*'] }),
    );

    const user = await repo.me(TOKEN);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
    expect(user).toEqual({ id: 'u1', email: 'a@b.co', roles: ['SUPER_ADMIN'], permissions: ['*'] });
  });

  it('me: usa el payload del access token si faltan campos', async () => {
    fetchMock.mockResolvedValue(makeResponse({ id: '', email: '', roles: [], permissions: [] }));
    const user = await repo.me(TOKEN);
    expect(user.id).toBe('u1');
    expect(user.email).toBe('a@b.co');
  });

  it('refresh: POST /api/auth/refresh con el refresh token y rota', async () => {
    fetchMock.mockResolvedValue(makeResponse({ accessToken: 'ACCESS-2', refreshToken: 'REFRESH-2' }));

    const pair = await repo.refresh('REFRESH-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'REFRESH-1' }),
      }),
    );
    expect(pair.refreshToken).toBe('REFRESH-2');
  });

  it('logout: POST /api/auth/logout con el refresh token', async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: true }));
    await expect(repo.logout('REFRESH')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('propaga los errores del servidor como ApiError con su mensaje', async () => {
    fetchMock.mockResolvedValue(makeResponse({ message: 'Credenciales inválidas' }, 401));

    const error = await repo.login('x@y.z', 'nope').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.status).toBe(401);
      expect(error.message).toBe('Credenciales inválidas');
    }
  });

  it('soporta mensajes de error en array (validación Zod)', async () => {
    fetchMock.mockResolvedValue(makeResponse({ message: ['email no válido', 'contraseña corta'] }, 400));

    const error = await repo.login('x', 'y').catch((e: unknown) => e);

    if (error instanceof ApiError) {
      expect(error.message).toBe('email no válido. contraseña corta');
    }
  });

  it('errores de red devuelven ApiError con status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('failed network'));

    const error = await repo.login('a@b.c', 'x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.status).toBe(0);
      expect(error.message).toContain('No se pudo contactar');
    }
  });
});