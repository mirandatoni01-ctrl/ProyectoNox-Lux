import { useCallback, useEffect, useState } from 'react';
import type { Order, OrderStatus } from '../../types';
import { getOrderRepository } from '../../services/repositories';

/**
 * Pedidos sobre el repositorio activo (NL-10). En modo `api` lee y transiciona
 * contra la NOX & LUX API (pedidos:ver / pedidos:gestionar).
 */
export function useOrders() {
  const repo = getOrderRepository();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await repo.list();
        if (cancelled) return;
        setOrders(loaded);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los pedidos');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await repo.list();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  const updateStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const updated = await repo.updateStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      return updated;
    },
    [repo],
  );

  return { orders, isLoading, error, reload, updateStatus };
}