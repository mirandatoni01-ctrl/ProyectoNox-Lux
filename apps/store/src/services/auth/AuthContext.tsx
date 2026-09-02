import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CustomerProfile } from '../../types';
import { authApi, getAccessToken, setAccessToken, type CustomerMe } from './authClient';

export interface AuthContextValue {
  /** Usuario autenticado (recuperado de la sesión persistida) o null. */
  user: CustomerMe | null;
  /** true mientras se revalida la sesión guardada al montar. */
  validating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (input: { fullName?: string; phone?: string }) => Promise<string | null>;
  changePassword: (
    input: { currentPassword: string; newPassword: string },
  ) => Promise<string | null>;
  createTicket: (input: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sesión del comprador (NL-13). Guarda el JWT en sessionStorage y expone
 * login/registro/logout. Al montar, si había sesión, la revalida con /auth/me.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [validating, setValidating] = useState(true);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
  }, []);

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setValidating(false);
      return;
    }
    const res = await authApi.me(handleUnauthorized);
    if (res.ok) {
      setUser(res.data);
    } else {
      setUser(null);
    }
    setValidating(false);
  }, [handleUnauthorized]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      if (!res.ok) throw new Error(res.error.message || 'Credenciales inválidas');
      setAccessToken(res.data.accessToken);
      await loadMe();
    },
    [loadMe],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      phone: string;
    }) => {
      const res = await authApi.registerCustomer(input);
      if (!res.ok) throw new Error(res.error.message || 'No se pudo crear la cuenta');
      setAccessToken(res.data.accessToken);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const updateProfile = useCallback(
    async (input: { fullName?: string; phone?: string }) => {
      const res = await authApi.updateProfile(input, handleUnauthorized);
      if (res.ok) {
        await loadMe();
        return null;
      }
      return res.error.message;
    },
    [handleUnauthorized, loadMe],
  );

  const changePassword = useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      const res = await authApi.changePassword(input, handleUnauthorized);
      if (res.ok) return null;
      return res.error.message;
    },
    [handleUnauthorized],
  );

  const createTicket = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      subject: string;
      message: string;
    }) => {
      const res = await authApi.createTicket(input, handleUnauthorized);
      if (res.ok) return null;
      return res.error.message;
    },
    [handleUnauthorized],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      validating,
      login,
      register,
      logout,
      refresh,
      updateProfile,
      changePassword,
      createTicket,
    }),
    [user, validating, login, register, logout, refresh, updateProfile, changePassword, createTicket],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}

export { getAccessToken, setAccessToken } from './authClient';