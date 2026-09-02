import { createContext } from 'react';
import type { AuthUser } from './AuthRepository';

/** Estado global de sesión del Admin. Contexto compartido por AuthProvider y useAuth. */
export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBooting: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);