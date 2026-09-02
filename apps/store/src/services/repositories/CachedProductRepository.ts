import { ApiError } from '../api/client';
import type { ProductCatalogResult, ProductRepository } from './types';
import type { ApiProductRepository } from './api/ApiProductRepository';
import type { LocalProductRepository } from './local/LocalProductRepository';

/**
 * Catálogo online-first con fallback offline (NL-11, decisión PO):
 * 1. Intenta la API (catálogo público real).
 * 2. Si funciona, refresca la caché local (last-known-good) y devuelve.
 * 3. Si la red está caída (ApiError status 0), sirve la caché con
 *    `fromCache: true` para que la UI avise "datos sin conexión".
 * Errores HTTP reales (p. ej. 5xx) se propagan (banner de error).
 */
export class CachedProductRepository implements ProductRepository {
  private _remote: ApiProductRepository;
  private _cache: LocalProductRepository;

  constructor(remote: ApiProductRepository, cache: LocalProductRepository) {
    this._remote = remote;
    this._cache = cache;
  }

  async listActive(): Promise<ProductCatalogResult> {
    try {
      const products = await this._remote.listActive();
      await this._cache.saveCatalog(products).catch(() => {
        // La caché es best-effort; no tumba el catálogo online.
      });
      return { products, fromCache: false };
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        return this._cache.listActive();
      }
      throw error;
    }
  }
}