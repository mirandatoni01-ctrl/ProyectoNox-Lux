import { describe, expect, it } from 'vitest';
import { DevAuthRepository } from '../auth/DevAuthRepository';

describe('DevAuthRepository (solo desarrollo)', () => {
  const repo = new DevAuthRepository();

  it('login exige email y contraseña', async () => {
    await expect(repo.login('', 'x')).rejects.toThrow('obligatorios');
    await expect(repo.login('a@b.c', '')).rejects.toThrow('obligatorios');
  });

  it('login devuelve un par de tokens de demostración', async () => {
    const pair = await repo.login('admin@noxlux.test', 'cualquiera');
    expect(pair.accessToken).toContain('dev.');
    expect(pair.refreshToken).toContain('dev-refresh');
  });

  it('me devuelve el perfil SUPER_ADMIN de demo', async () => {
    const user = await repo.me('ignorado');
    expect(user.id).toBe('dev-super-admin');
    expect(user.email).toBe('admin@noxlux.test');
    expect(user.roles).toEqual(['SUPER_ADMIN']);
  });

  it('refresh devuelve un nuevo par (demo no rota de verdad)', async () => {
    const pair = await repo.refresh('ignorado');
    expect(pair.accessToken).toContain('dev.');
    expect(pair.refreshToken).toContain('dev-refresh');
  });

  it('logout no lanza', async () => {
    await expect(repo.logout('ignorado')).resolves.toBeUndefined();
  });
});