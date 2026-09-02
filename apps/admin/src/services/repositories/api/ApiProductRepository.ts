import { ApiError, authedRequest } from '../../api/client';
import type { ProductRepository } from '../types';
import type { Product } from '../../../types';
import {
  type ApiProduct,
  fromApiProduct,
  toApiCreateProduct,
  toApiUpdateProduct,
} from './mappers';

/**
 * Repositorio de productos sobre la NOX & LUX API (NL-07).
 * Endpoints: GET /api/products, GET /api/products/:id,
 * POST /api/products, PATCH /api/products/:id,
 * POST /api/products/:id/toggle, DELETE /api/products/:id.
 * El ACCESS token se adjunta desde tokenStorage (memoria); el refresh/
 * redirect 401 queda fuera del alcance de NL-07 (NL-12).
 */
export class ApiProductRepository implements ProductRepository {
  async getAll(): Promise<Product[]> {
    const result = await authedRequest<ApiProduct[]>('/api/products');
    if (!result.ok) throw result.error;
    return result.data.map(fromApiProduct);
  }

  async getById(id: string): Promise<Product | undefined> {
    const result = await authedRequest<ApiProduct>(`/api/products/${id}`);
    if (!result.ok) {
      if (result.error instanceof ApiError && result.error.status === 404) {
        return undefined;
      }
      throw result.error;
    }
    return fromApiProduct(result.data);
  }

  async create(product: Product): Promise<void> {
    const result = await authedRequest<ApiProduct>('/api/products', {
      method: 'POST',
      body: JSON.stringify(toApiCreateProduct(product)),
    });
    if (!result.ok) throw result.error;
  }

  async update(product: Product): Promise<void> {
    const result = await authedRequest<ApiProduct>(`/api/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify(toApiUpdateProduct(product)),
    });
    if (!result.ok) throw result.error;
  }

  async toggleActive(id: string): Promise<Product | undefined> {
    const result = await authedRequest<ApiProduct>(`/api/products/${id}/toggle`, {
      method: 'POST',
    });
    if (!result.ok) {
      if (result.error instanceof ApiError && result.error.status === 404) {
        return undefined;
      }
      throw result.error;
    }
    return fromApiProduct(result.data);
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const result = await authedRequest<{ id: string; deleted: boolean }>(
      `/api/products/${productId}/images/${imageId}`,
      { method: 'DELETE' },
    );
    if (!result.ok) throw result.error;
  }
}