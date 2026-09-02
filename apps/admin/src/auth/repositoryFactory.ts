import { ApiAuthRepository } from './ApiAuthRepository';
import { DevAuthRepository } from './DevAuthRepository';
import type { AuthRepository } from './AuthRepository';

/**
 * Fábrica del repositorio de autenticación.
 *
 * `VITE_AUTH_MODE=api` -> backend real (producción / integración).
 * Otro valor / ausente   -> demostración local (solo desarrollo).
 *
 * NL-12: en un build de producción se prohíbe el modo demo (DevAuthRepository)
 * — forzamos el backend real para no exponer datos de demostración como si
 * fueran producción.
 */
if (import.meta.env.PROD && import.meta.env.VITE_AUTH_MODE !== 'api') {
  throw new Error(
    'NL-12: el Admin en producción exige VITE_AUTH_MODE=api (backend real). ' +
      'El modo demo (DevAuthRepository) solo está permitido en desarrollo.',
  );
}

let authRepository: AuthRepository | undefined;

export function getAuthRepository(): AuthRepository {
  if (!authRepository) {
    authRepository = import.meta.env.VITE_AUTH_MODE === 'api' ? new ApiAuthRepository() : new DevAuthRepository();
  }
  return authRepository;
}