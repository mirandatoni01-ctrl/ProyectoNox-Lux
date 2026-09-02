import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE as string | undefined;

/**
 * Pantalla de inicio de sesión del Admin. Con `VITE_AUTH_MODE=api` autentica
 * contra la NOX & LUX API (NL-05); en modo dev, contra el repositorio local
 * de demostración (SOLO desarrollo — nunca producción).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/productos" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6">
      <div className="w-full max-w-sm bg-white p-8">
        <p className="text-center text-[10px] tracking-[0.4em] text-neutral-400">NOX &amp; LUX</p>
        <h1 className="mt-2 text-center text-xl font-bold tracking-widest uppercase">Admin panel</h1>
        <p className="mt-1 text-center text-xs text-neutral-500">Solo personal autorizado</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs tracking-wider text-neutral-500">EMAIL</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="admin@noxlux.com"
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black"
            />
          </label>

          <label className="block">
            <span className="text-xs tracking-wider text-neutral-500">CONTRASEÑA</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black"
            />
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 bg-black py-3 text-xs font-bold tracking-widest text-white uppercase hover:bg-neutral-800 disabled:opacity-50"
          >
            <LogIn size={14} /> {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        {AUTH_MODE !== 'api' && (
          <p className="mt-6 rounded border border-amber-300 bg-amber-50 p-3 text-center text-[10px] leading-relaxed text-amber-700">
            MODO DEMO (desarrollo). El API real requiere PostgreSQL. Ej:
            <span className="font-bold"> admin@noxlux.test</span> / cualquier contraseña.
          </p>
        )}
      </div>
    </div>
  );
}