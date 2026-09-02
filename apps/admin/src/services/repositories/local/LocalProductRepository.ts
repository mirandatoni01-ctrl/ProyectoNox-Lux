import { db } from '../../storage/db';
import type { Product } from '../../../types';
import type { ProductRepository } from '../types';

/** Implementación local (IndexedDB) del port de productos del Admin. */
export class LocalProductRepository implements ProductRepository {
  async getAll(): Promise<Product[]> {
    return db.products.toArray();
  }

  async getById(id: string): Promise<Product | undefined> {
    return db.products.get(id);
  }

  async create(product: Product): Promise<void> {
    await db.products.put(product);
  }

  async update(product: Product): Promise<void> {
    await db.products.put(product);
  }

  async toggleActive(id: string): Promise<Product | undefined> {
    const product = await db.products.get(id);
    if (!product) return undefined;
    const updated: Product = { ...product, isActive: !product.isActive };
    await db.products.put(updated);
    return updated;
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const product = await db.products.get(productId);
    if (product?.images) {
      await db.products.put({
        ...product,
        images: product.images.filter((img) => img.id !== imageId),
      });
    }
  }
}