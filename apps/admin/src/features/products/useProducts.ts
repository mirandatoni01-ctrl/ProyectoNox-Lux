import { useCallback, useEffect, useState } from 'react';
import type { Product } from '../../types';
import { getProductRepository } from '../../services/repositories';

/**
 * CRUD de productos sobre el repositorio activo (hoy IndexedDB, mañana REST).
 * Mismo contrato que el hook homólogo del Store, sin la parte del carrito.
 */
export function useProducts() {
  const repo = getProductRepository();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await repo.getAll();
        if (cancelled) return;
        setProducts(loaded);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los productos');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await repo.getAll();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos');
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    await fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(
    async (product: Product) => {
      await repo.create(product);
      setProducts((prev) => [...prev, product]);
    },
    [repo],
  );

  const updateProduct = useCallback(
    async (product: Product) => {
      await repo.update(product);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    },
    [repo],
  );

  const toggleProductStatus = useCallback(
    async (id: string) => {
      const updated = await repo.toggleActive(id);
      if (updated) {
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      return updated;
    },
    [repo],
  );

  return { products, isLoading, error, reload, createProduct, updateProduct, toggleProductStatus };
}