import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from './AuthRepository';
import { getAuthRepository } from './repositoryFactory';
import { clearTokens, getRefreshToken, setTokens } from './tokenStorage';
import { AuthContext, type AuthContextValue } from './context';

/**
 * Proveedor de sesión del Admin. Al arrancar, si existe un refresh token en
 * sessionStorage lo rota (/api/auth/refresh) y recupera el perfil; si falla,
 * limpia la sesión. El access token queda SOLO en memoria (ADR-NL-006).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    const repo = getAuthRepository();
    const pair = await repo.login(email, password);
    setTokens(pair);
    const profile = await repo.me(pair.accessToken);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    const repo = getAuthRepository();
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await repo.logout(refreshToken);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const repo = getAuthRepository();
        const refreshToken = getRefreshToken();
        if (!refreshToken) return;
        const pair = await repo.refresh(refreshToken);
        setTokens(pair);
        const profile = await repo.me(pair.accessToken);
        if (!cancelled) setUser(profile);
      } catch {
        clearTokens();
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isBooting,
      login,
      logout,
    }),
    [user, isBooting, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}