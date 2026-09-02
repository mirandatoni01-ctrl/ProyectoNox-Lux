import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../services/storage/db';
import { LocalCartRepository } from '../services/repositories/local/LocalCartRepository';
import { LocalProductRepository } from '../services/repositories/local/LocalProductRepository';
import type { CartItem, Product } from '../types';

const product: Product = {
  id: 'prod-test',
  name: 'ANILLO TEST',
  category: 'anillos',
  basePrice: 10,
  material: 'COVERGOLD',
  description: 'Producto de prueba.',
  variants: [
    {
      id: 'var-test-1',
      sku: 'VAR-MANUAL',
      material: 'COVERGOLD',
      size: 'Talla 6',
      stock: 5,
      reserved: 2,
      priceOverride: 10,
      status: 'ACTIVE',
    },
  ],
  isActive: true,
  imageUrl: '',
};

const cartItem: CartItem = {
  id: 'var-test-1',
  productId: 'prod-test',
  productVariantId: 'var-test-1',
  name: 'ANILLO TEST',
  material: 'COVERGOLD',
  size: 'Talla 6',
  price: 10,
  quantity: 2,
  imageUrl: '',
};

describe('LocalProductRepository (caché de catálogo, NL-11)', () => {
  const repo = new LocalProductRepository();

  beforeEach(async () => {
    await db.products.clear();
  });

  it('inicia vacío desde caché', async () => {
    const result = await repo.listActive();
    expect(result.products).toEqual([]);
    expect(result.fromCache).toBe(true);
  });

  it('saveCatalog guarda y listActive lo devuelve como caché', async () => {
    await repo.saveCatalog([product]);
    const result = await repo.listActive();
    expect(result.products).toEqual([product]);
    expect(result.fromCache).toBe(true);
  });

  it('filtra inactivos', async () => {
    const inactive = { ...product, id: 'prod-2', isActive: false };
    await repo.saveCatalog([product, inactive]);
    const result = await repo.listActive();
    expect(result.products.map((p) => p.id)).toEqual([product.id]);
  });

  it('saveCatalog reemplaza el catálogo completo (last-known-good)', async () => {
    await repo.saveCatalog([product]);
    await repo.saveCatalog([]);
    const result = await repo.listActive();
    expect(result.products).toEqual([]);
  });

  it('persiste entre instancias (simula recarga)', async () => {
    await repo.saveCatalog([product]);
    const other = new LocalProductRepository();
    const result = await other.listActive();
    expect(result.products).toEqual([product]);
  });
});

describe('LocalCartRepository', () => {
  const repo = new LocalCartRepository();

  beforeEach(async () => {
    await db.cartItems.clear();
  });

  it('inicia vacío', async () => {
    expect(await repo.getItems()).toEqual([]);
  });

  it('guarda y recupera items', async () => {
    await repo.setItems([cartItem]);
    expect(await repo.getItems()).toEqual([cartItem]);
  });

  it('persiste entre instancias (simula recarga)', async () => {
    await repo.setItems([cartItem]);
    const other = new LocalCartRepository();
    expect(await other.getItems()).toEqual([cartItem]);
  });

  it('clear vacía el carrito', async () => {
    await repo.setItems([cartItem]);
    await repo.clear();
    expect(await repo.getItems()).toEqual([]);
  });
});