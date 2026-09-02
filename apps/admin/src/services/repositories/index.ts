import { ApiProductRepository } from './api/ApiProductRepository';
import { ApiInventoryRepository } from './api/ApiInventoryRepository';
import { ApiMediaRepository } from './api/ApiMediaRepository';
import { ApiOrderRepository } from './api/ApiOrderRepository';
import { LocalProductRepository } from './local/LocalProductRepository';
import { LocalInventoryRepository } from './local/LocalInventoryRepository';
import { LocalMediaRepository } from './local/LocalMediaRepository';
import { LocalOrderRepository } from './local/LocalOrderRepository';
import type {
  InventoryRepository,
  MediaRepository,
  OrderRepository,
  ProductRepository,
} from './types';

export type { InventoryRepository, MediaRepository, OrderRepository, ProductRepository } from './types';

/**
 * Fábrica de repositorios (inyección simple; ADR-NL-002/003).
 * `VITE_AUTH_MODE=api` -> NOX & LUX API (PostgreSQL) — modo integración.
 * Otro valor / ausente   -> IndexedDB local — demostración de desarrollo.
 */
let productRepository: ProductRepository | undefined;
let inventoryRepository: InventoryRepository | undefined;
let mediaRepository: MediaRepository | undefined;
let orderRepository: OrderRepository | undefined;

export function getProductRepository(): ProductRepository {
  if (!productRepository) {
    productRepository =
      import.meta.env.VITE_AUTH_MODE === 'api'
        ? new ApiProductRepository()
        : new LocalProductRepository();
  }
  return productRepository;
}

export function getInventoryRepository(): InventoryRepository {
  if (!inventoryRepository) {
    inventoryRepository =
      import.meta.env.VITE_AUTH_MODE === 'api'
        ? new ApiInventoryRepository()
        : new LocalInventoryRepository();
  }
  return inventoryRepository;
}

export function getMediaRepository(): MediaRepository {
  if (!mediaRepository) {
    mediaRepository =
      import.meta.env.VITE_AUTH_MODE === 'api'
        ? new ApiMediaRepository()
        : new LocalMediaRepository();
  }
  return mediaRepository;
}

export function getOrderRepository(): OrderRepository {
  if (!orderRepository) {
    orderRepository =
      import.meta.env.VITE_AUTH_MODE === 'api'
        ? new ApiOrderRepository()
        : new LocalOrderRepository();
  }
  return orderRepository;
}