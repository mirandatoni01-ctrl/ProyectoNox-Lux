import { beforeEach, describe, expect, it } from 'vitest';
import { LocalProductRepository } from '../services/repositories/local/LocalProductRepository';
import { db } from '../services/storage/db';
import type { Product } from '../types';

function makeProduct(over: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'ANILLO AURA GOLD',
    category: 'anillos',
    basePrice: 85000,
    material: 'COVERGOLD',
    description: 'Bisutería fina de alta durabilidad.',
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
    variants: [{ material: 'COVERGOLD', size: 'ÚNICA', stock: 10, priceOverride: 85000 }],
    ...over,
  };
}

describe('LocalProductRepository (IndexedDB nox-lux-db)', () => {
  const repo = new LocalProductRepository();

  beforeEach(async () => {
    await db.products.clear();
  });

  it('create + getAll persiste y lista el producto', async () => {
    await repo.create(makeProduct());
    const all = await repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('ANILLO AURA GOLD');
  });

  it('getById devuelve el producto o undefined', async () => {
    await repo.create(makeProduct());
    await expect(repo.getById('prod-1')).resolves.toMatchObject({ id: 'prod-1' });
    await expect(repo.getById('no-existe')).resolves.toBeUndefined();
  });

  it('update reemplaza el producto (upsert sobre el mismo id)', async () => {
    await repo.create(makeProduct());
    await repo.update(makeProduct({ basePrice: 100000 }));
    const all = await repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].basePrice).toBe(100000);
  });

  it('toggleActive alterna el estado del catálogo', async () => {
    await repo.create(makeProduct({ isActive: true }));
    const toggled = await repo.toggleActive('prod-1');
    expect(toggled?.isActive).toBe(false);
    const store = await repo.getAll();
    expect(store[0].isActive).toBe(false);
  });

  it('toggleActive de un producto inexistente devuelve undefined', async () => {
    await expect(repo.toggleActive('no-existe')).resolves.toBeUndefined();
  });
});