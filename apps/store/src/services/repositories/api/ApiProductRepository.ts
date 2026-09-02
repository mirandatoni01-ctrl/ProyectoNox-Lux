import { request } from '../../api/client';
import type { Product } from '../../../types';
import { type ApiProduct, fromApiProduct } from './mappers';

/**
 * Catálogo público del Store (NL-11): GET /api/products/catalog devuelve solo
 * productos activos con stock/reservado reales por variante. Sin sesión.
 * Si la red falla arroja ApiError con status 0 (lo captura la caché).
 */
export class ApiProductRepository {
  async listActive(): Promise<Product[]> {
    const result = await request<ApiProduct[]>('/api/products/catalog');
    if (!result.ok) throw result.error;
    return result.data.map(fromApiProduct);
  }
}