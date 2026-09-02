import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './context';

/** Acceso al estado de sesión del Admin (debe usarse dentro de <AuthProvider>). */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}