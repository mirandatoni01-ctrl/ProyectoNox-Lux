import { useCallback, useEffect, useState } from 'react';
import type { StockEntry } from '../../types';
import { getInventoryRepository } from '../../services/repositories';

/**
 * Inventario sobre el repositorio activo (NL-08). En modo `api` lee y
 * escribe el stock contra la NOX & LUX API (requiere inventario:editar).
 */
export function useInventory() {
  const repo = getInventoryRepository();
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await repo.list();
        if (cancelled) return;
        setEntries(loaded);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el inventario');
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
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario');
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  const setStock = useCallback(
    async (variantId: string, stockOnHand: number, reason?: string) => {
      const updated = await repo.setStock(variantId, stockOnHand, reason);
      setEntries((prev) => prev.map((e) => (e.productVariantId === variantId ? updated : e)));
      return updated;
    },
    [repo],
  );

  const adjustStock = useCallback(
    async (variantId: string, delta: number, reason?: string) => {
      const updated = await repo.adjustStock(variantId, delta, reason);
      setEntries((prev) => prev.map((e) => (e.productVariantId === variantId ? updated : e)));
      return updated;
    },
    [repo],
  );

  return { entries, isLoading, error, reload, setStock, adjustStock };
}