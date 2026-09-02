import { authedRequest } from '../../api/client';
import type { StockEntry } from '../../../types';
import type { InventoryRepository } from '../types';

/** Entrada de stock tal como la devuelve GET /api/inventory (NL-08). */
export interface ApiStockEntry {
  productVariantId: string;
  sku: string;
  productId: string;
  productName: string;
  material: 'STAINLESS_STEEL' | 'COVERGOLD' | 'RHODIUM';
  size: string;
  status: string;
  stockOnHand: number;
  reserved: number;
  available: number;
}

function fromApiStockEntry(dto: ApiStockEntry): StockEntry {
  return {
    productVariantId: dto.productVariantId,
    sku: dto.sku,
    productId: dto.productId,
    productName: dto.productName,
    material: dto.material,
    size: dto.size,
    status: dto.status,
    stockOnHand: dto.stockOnHand,
    reserved: dto.reserved,
    available: dto.available,
  };
}

/**
 * Repositorio de inventario sobre la NOX & LUX API (NL-08).
 * Endpoints: GET /api/inventory, PUT /api/inventory/:variantId (set stock),
 * POST /api/inventory/:variantId/adjust (delta ±). Requiere `inventario:editar`.
 */
export class ApiInventoryRepository implements InventoryRepository {
  async list(): Promise<StockEntry[]> {
    const result = await authedRequest<ApiStockEntry[]>('/api/inventory');
    if (!result.ok) throw result.error;
    return result.data.map(fromApiStockEntry);
  }

  async setStock(variantId: string, stockOnHand: number, reason?: string): Promise<StockEntry> {
    const result = await authedRequest<ApiStockEntry>(`/api/inventory/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify({ stockOnHand, ...(reason ? { reason } : {}) }),
    });
    if (!result.ok) throw result.error;
    return fromApiStockEntry(result.data);
  }

  async adjustStock(variantId: string, delta: number, reason?: string): Promise<StockEntry> {
    const result = await authedRequest<ApiStockEntry>(`/api/inventory/${variantId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ delta, ...(reason ? { reason } : {}) }),
    });
    if (!result.ok) throw result.error;
    return fromApiStockEntry(result.data);
  }
}