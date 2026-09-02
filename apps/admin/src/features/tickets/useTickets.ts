import { useCallback, useEffect, useState } from 'react';
import type { ContactTicket, TicketStatusValue } from '../../types';
import { authedRequest } from '../../services/api/client';

/**
 * Tickets de contacto (NL-13) contra la NOX & LUX API (/api/tickets).
 * Requiere `tickets:ver` para listar y `tickets:gestionar` para cambiar estado.
 */
export function useTickets() {
  const [tickets, setTickets] = useState<ContactTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedRequest<ContactTicket[]>('/api/tickets');
        if (cancelled) return;
        if (res.ok) {
          setTickets(res.data);
          setError(null);
        } else {
          setError(res.error.message);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los tickets');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authedRequest<ContactTicket[]>('/api/tickets');
      if (res.ok) {
        setTickets(res.data);
        setError(null);
      } else {
        setError(res.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los tickets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: TicketStatusValue, adminNote?: string): Promise<ContactTicket> => {
      const res = await authedRequest<ContactTicket>(`/api/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(adminNote ? { adminNote } : {}) }),
      });
      if (!res.ok) throw res.error;
      const updated = res.data;
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    },
    [],
  );

  return { tickets, isLoading, error, reload, updateStatus };
}