import { ApiProductRepository } from './api/ApiProductRepository';
import { ApiOrderRepository } from './api/ApiOrderRepository';
import { CachedProductRepository } from './CachedProductRepository';
import { LocalCartRepository } from './local/LocalCartRepository';
import { LocalProductRepository } from './local/LocalProductRepository';
import type {
  CartRepository,
  CreateOrderInput,
  OrderRepository,
  ProductRepository,
} from './types';
import type { Order } from '../../types';

export type { CartRepository, OrderRepository, ProductRepository, CreateOrderInput };

/**
 * NOX & LUX — Fábrica de repositorios (inyección de dependencia simple,
 * ADR-NL-002). Desde NL-11 el Store consume la API:
 *  - productos: `CachedProductRepository` (API + caché IndexedDB offline),
 *  - carrito: local (el pedido se persiste en la API al confirmar),
 *  - pedidos: `ApiOrderRepository` (POST /api/orders, anónimo).
 */

let productRepository: ProductRepository | undefined;
let cartRepository: CartRepository | undefined;
let orderRepository: OrderRepository | undefined;

export function getProductRepository(): ProductRepository {
  if (!productRepository) {
    productRepository = new CachedProductRepository(
      new ApiProductRepository(),
      new LocalProductRepository(),
    );
  }
  return productRepository;
}

export function getCartRepository(): CartRepository {
  if (!cartRepository) {
    cartRepository = new LocalCartRepository();
  }
  return cartRepository;
}

export type { Order };
export function getOrderRepository(): OrderRepository {
  if (!orderRepository) {
    orderRepository = new ApiOrderRepository();
  }
  return orderRepository;
}