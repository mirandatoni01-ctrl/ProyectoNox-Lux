import { db } from '../../storage/db';
import type { Product } from '../../../types';
import type { ProductCatalogResult, ProductRepository } from '../types';

/**
 * Implementación local (IndexedDB) del port de productos, usada como CACHÉ
 * de catálogo (last-known-good) y fallback offline desde NL-11. La fuente
 * primaria es la API; esta tabla la refresca `CachedProductRepository`.
 */
export class LocalProductRepository implements ProductRepository {
  async listActive(): Promise<ProductCatalogResult> {
    const all = await db.products.toArray();
    return { products: all.filter((p) => p.isActive), fromCache: true };
  }

  /** Guarda el catálogo remoto como caché (best-effort). */
  async saveCatalog(products: Product[]): Promise<void> {
    await db.products.clear();
    if (products.length > 0) {
      await db.products.bulkPut(products);
    }
  }
}