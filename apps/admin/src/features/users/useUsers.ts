import { useCallback, useEffect, useState } from 'react';
import type { AdminUser } from '../../types';
import { authedRequest, ApiError } from '../../services/api/client';

/**
 * Gestión de usuarios (NL-13) contra la NOX & LUX API (/api/users).
 * Requiere `usuarios:ver` para listar y `usuarios:gestionar` para actualizar.
 */
export function useUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedRequest<AdminUser[]>('/api/users');
        resolveList(res, cancelled, setUsers, setError, setIsLoading);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authedRequest<AdminUser[]>('/api/users');
      if (res.ok) {
        setUsers(res.data);
        setError(null);
      } else {
        setError(res.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const update = useCallback(
    async (id: string, input: { roleCodes?: string[]; isActive?: boolean }): Promise<AdminUser> => {
      const res = await authedRequest<AdminUser>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      if (!res.ok) throw res.error;
      const updated = res.data;
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return updated;
    },
    [],
  );

  return { users, isLoading, error, reload, update };
}

function resolveList(
  res:
    | { ok: true; data: AdminUser[] }
    | { ok: false; error: ApiError },
  cancelled: boolean,
  setUsers: (v: AdminUser[]) => void,
  setError: (m: string | null) => void,
  setIsLoading: (v: boolean) => void,
) {
  if (cancelled) return;
  if (res.ok) {
    setUsers(res.data);
    setError(null);
  } else {
    setError(res.error.message);
  }
  setIsLoading(false);
}