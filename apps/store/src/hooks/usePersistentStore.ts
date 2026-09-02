import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CartItem, Order, Product } from '../types';
import { getCartRepository, getOrderRepository, getProductRepository } from '../services/repositories';
import type { CartRepository, CreateOrderInput, ProductRepository } from '../services/repositories';

/**
 * NOX & LUX — Hook de estado persistente (NL-11).
 * Productos: catálogo de la API con caché IndexedDB (offline last-known-good).
 * Carrito: local; al confirmar el pedido se crea en la API (POST /api/orders).
 * Disponibilidad UI = stock − reserved (reserva real del servidor).
 */

/** Disponible de una variante para el carrito (guard soft; el hard es del API). */
function availableOf(product: Product | undefined, variantId: string): number {
  if (!product) return 0;
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return 0;
  return (variant.stock ?? 0) - (variant.reserved ?? 0);
}

export function usePersistentStore() {
  const productRepo: ProductRepository = getProductRepository();
  const cartRepo: CartRepository = getCartRepository();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const { products: loaded, fromCache } = await productRepo.listActive();
      setProducts(loaded);
      setIsFromCache(fromCache);
      if (fromCache) setError('Conectividad limitada: mostrando catálogo guardado (sin conexión).');
      else setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el catálogo');
    }
  }, [productRepo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, loadedCart] = await Promise.all([
          productRepo.listActive(),
          cartRepo.getItems(),
        ]);
        if (cancelled) return;
        setProducts(catalog.products);
        setIsFromCache(catalog.fromCache);
        setCart(loadedCart);
        if (catalog.fromCache) {
          setError('Conectividad limitada: mostrando catálogo guardado (sin conexión).');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar los datos');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productRepo, cartRepo]);

  const persistCart = useCallback(
    (updater: (prev: CartItem[]) => CartItem[]) => {
      setCart((prev) => {
        const next = updater(prev);
        void cartRepo.setItems(next).catch(() => {
          setError('Error al guardar el carrito');
        });
        return next;
      });
    },
    [cartRepo],
  );

  const addToCart = useCallback(
    (product: Product, variant: Product['variants'][number]) => {
      const variantId = variant.id ?? '';
      const cartItemId = variantId || `${product.id}-${variant.material}-${variant.size}`;
      const price = variant.priceOverride || product.basePrice;
      const available = availableOf(product, variantId);
      persistCart((prev) => {
        const existing = prev.find((item) => item.id === cartItemId);
        if (existing) {
          if (existing.quantity >= available) return prev;
          return prev.map((item) =>
            item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }
        return [
          ...prev,
          {
            id: cartItemId,
            productId: product.id,
            productVariantId: variantId,
            name: product.name,
            material: variant.material,
            size: variant.size,
            price,
            quantity: 1,
            imageUrl: product.imageUrl,
          },
        ];
      });
    },
    [persistCart],
  );

  const updateQuantity = useCallback(
    (cartItemId: string, delta: number) => {
      persistCart((prev) =>
        prev.map((item) => {
          if (item.id === cartItemId) {
            const available = availableOf(
              products.find((p) => p.id === item.productId),
              item.productVariantId,
            );
            const newQty = item.quantity + delta;
            if (newQty <= 0) return item;
            return newQty > available ? { ...item, quantity: available } : { ...item, quantity: newQty };
          }
          return item;
        }),
      );
    },
    [persistCart, products],
  );

  const removeItem = useCallback(
    (cartItemId: string) => {
      persistCart((prev) => prev.filter((item) => item.id !== cartItemId));
    },
    [persistCart],
  );

  const clearCart = useCallback(() => {
    persistCart(() => []);
  }, [persistCart]);

  const createOrder = useCallback(
    async (draft: CreateOrderInput): Promise<Order> => {
      return getOrderRepository().create(draft);
    },
    [],
  );

  const refreshProducts = useCallback(() => {
    void loadProducts();
  }, [loadProducts]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const cartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  return {
    products,
    cart,
    isLoading,
    isFromCache,
    error,
    cartTotal,
    cartItemsCount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    createOrder,
    refreshProducts,
  };
}