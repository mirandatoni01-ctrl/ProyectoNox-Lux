import { validateEnv } from './env';

describe('validateEnv (config, NL-12)', () => {
  const base = {
    NODE_ENV: 'development',
    JWT_ACCESS_SECRET: 'access-secret-abcdefghijklmnopqrstuvwxyz123456',
    JWT_REFRESH_SECRET: 'refresh-secret-abcdefghijklmnopqrstuvwxyz123456',
    CORS_ORIGINS: 'http://localhost:5173,http://localhost:5174',
  };

  it('devuelve la config con valores por defecto', () => {
    const cfg = validateEnv({ ...base });
    expect(cfg.nodeEnv).toBe('development');
    expect(cfg.corsOrigins).toEqual(['http://localhost:5173', 'http://localhost:5174']);
    expect(cfg.jwt.accessSecret).toBe(base.JWT_ACCESS_SECRET);
    expect(cfg.rate.globalMax).toBe(300);
    expect(cfg.rate.ttlMs).toBe(60_000);
  });

  it('parsea CORS_ORIGINS con espacios y vacíos', () => {
    const cfg = validateEnv({ ...base, CORS_ORIGINS: 'http://a.com, , http://b.com' });
    expect(cfg.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
  });

  it('lanza si falta un secreto JWT', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: '' })).toThrow(
      /JWT_ACCESS_SECRET es obligatorio/,
    );
  });

  it('lanza si los secretos usan valores de ejemplo', () => {
    expect(() =>
      validateEnv({ ...base, JWT_ACCESS_SECRET: 'changeme', JWT_REFRESH_SECRET: 'changeme2-long' }),
    ).toThrow(/secretos JWT no pueden usar valores de ejemplo/);
  });

  it('lanza si ambos secretos son idénticos', () => {
    expect(() =>
      validateEnv({ ...base, JWT_ACCESS_SECRET: 'same-long-abcdefghijk', JWT_REFRESH_SECRET: 'same-long-abcdefghijk' }),
    ).toThrow(/deben diferir/);
  });

  it('en producción exige secretos de al menos 32 caracteres', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'corto', JWT_REFRESH_SECRET: 'tambien-corto' }),
    ).toThrow(/no pueden usar valores de ejemplo o ser débiles/);
  });

  it('lanza si CORS_ORIGINS está vacía', () => {
    expect(() => validateEnv({ ...base, CORS_ORIGINS: ' ' })).toThrow(/CORS_ORIGINS vacía/);
  });

  it('lanza si un origen CORS no es http(s)', () => {
    expect(() => validateEnv({ ...base, CORS_ORIGINS: 'javascript:alert(1)' })).toThrow(/origen CORS no permitido/);
  });

  it('lanza si CORS_ORIGINS es *', () => {
    expect(() => validateEnv({ ...base, CORS_ORIGINS: '*' })).toThrow(/origen CORS no permitido/);
  });

  it('respeta THROTTLE_* y API_PORT/UPLOAD_MAX_MB', () => {
    const cfg = validateEnv({
      ...base,
      API_PORT: '4000',
      UPLOAD_MAX_MB: '10',
      THROTTLE_LOGIN: '3',
      THROTTLE_GLOBAL: '120',
      THROTTLE_TTL: '30000',
    });
    expect(cfg.apiPort).toBe(4000);
    expect(cfg.uploadMaxMb).toBe(10);
    expect(cfg.rate.loginMax).toBe(3);
    expect(cfg.rate.globalMax).toBe(120);
    expect(cfg.rate.ttlMs).toBe(30_000);
  });
});
