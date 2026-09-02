import { type AuthRepository, type AuthUser, type TokenPair } from './AuthRepository';

const DEV_USER: AuthUser = {
  id: 'dev-super-admin',
  email: 'admin@noxlux.test',
  roles: ['SUPER_ADMIN'],
  permissions: ['*'],
};

const DEV_REFRESH = `dev-refresh.${Date.now()}`;

/**
 * Implementación SOLO-PARA-DESARROLLO del port de autenticación.
 *
 * Permite probar el flujo del panel sin backend ni PostgreSQL (el API de NL-05
 * requiere BD). NUNCA debe usarse en producción: no valida credenciales, no
 * emite tokens reales ni rota/revoca nada. Ver SECURITY_MODEL.md.
 */
export class DevAuthRepository implements AuthRepository {
  async login(email: string, password: string): Promise<TokenPair> {
    if (!email || !password) {
      throw new Error('Email y contraseña son obligatorios');
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    const payload = btoa(JSON.stringify({ sub: DEV_USER.id, email }));
    return { accessToken: `dev.${payload}`, refreshToken: DEV_REFRESH };
  }

  async me(_accessToken: string): Promise<AuthUser> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return DEV_USER;
  }

  async refresh(_refreshToken: string): Promise<TokenPair> {
    const payload = btoa(JSON.stringify({ sub: DEV_USER.id, email: DEV_USER.email }));
    return { accessToken: `dev.${payload}`, refreshToken: DEV_REFRESH };
  }

  async logout(_refreshToken: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}