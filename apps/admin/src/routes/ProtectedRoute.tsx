import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

/** Guard de ruta: redirige al login si no hay sesión activa. */
export function ProtectedRoute() {
  const { isAuthenticated, isBooting } = useAuth();

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-xs tracking-widest text-neutral-400 uppercase">Verificando sesión…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}