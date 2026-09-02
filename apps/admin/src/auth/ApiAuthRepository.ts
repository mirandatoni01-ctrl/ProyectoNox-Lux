import { request } from '../services/api/client';
import type {
  AuthRepository,
  AuthUser,
  TokenPair,
} from './AuthRepository';
import { decodeAccessTokenPayload } from './AuthRepository';

export { ApiError } from '../services/api/client';

/**
 * Implementación del port de autenticación sobre la NOX & LUX API.
 * Endpoints (NL-05): POST /api/auth/login, GET /api/auth/me,
 * POST /api/auth/refresh, POST /api/auth/logout.
 */
export class ApiAuthRepository implements AuthRepository {
  async login(email: string, password: string): Promise<TokenPair> {
    const result = await request<TokenPair>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!result.ok) throw result.error;
    return result.data;
  }

  async me(accessToken: string): Promise<AuthUser> {
    const result = await request<{
      id: string;
      email: string;
      roles: string[];
      permissions: string[];
    }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!result.ok) throw result.error;
    const payload = decodeAccessTokenPayload(accessToken);
    return {
      id: result.data.id || (payload?.sub ?? ''),
      email: result.data.email || (payload?.email ?? ''),
      roles: result.data.roles ?? [],
      permissions: result.data.permissions ?? [],
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const result = await request<TokenPair>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    if (!result.ok) throw result.error;
    return result.data;
  }

  async logout(refreshToken: string): Promise<void> {
    const result = await request<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    if (!result.ok) throw result.error;
  }
}