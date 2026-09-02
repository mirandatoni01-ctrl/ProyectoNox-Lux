import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CreateOrderDto,
  type ListOrdersQuery,
  type UpdateOrderStatusDto,
} from './dto/order.dto';
import {
  type WhatsAppProvider,
  WHATSAPP_PROVIDER,
} from './whatsapp/whatsapp';
import { AuditService } from '../audit/audit.service';
import {
  buildOrderWhatsAppMessage,
  buildWhatsAppLink,
} from './whatsapp/whatsapp-message';

/**
 * Pedidos (NL-10). Ciclo: pending → confirmed → completed (o cancelled).
 * RESERVA de stock al crear (no-sobreventa contra available = stockOnHand −
 * reserved), liberación al cancelar y consumo al completar, siempre dentro de
 * la misma transacción y con ledger StockMovement (ref_type='order'). El precio
 * se calcula server-side (priceOverride ?? basePrice); el mensaje y el número
 * de negocio de WhatsApp son propiedad del servidor (SECURITY_MODEL NL-10).
 */
type Status = 'pending' | 'confirmed' | 'cancelled' | 'completed';

const orderDetailInclude = {
  customer: true,
  items: {
    include: {
      productVariant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: { orderBy: { position: 'asc' }, take: 1 },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

type OrderWithItemsForStock = Prisma.OrderGetPayload<{
  include: { items: { include: { productVariant: { include: { inventory: true } } } } };
}>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  private readonly TRANSITIONS: Record<Status, readonly Status[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    cancelled: [],
    completed: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  /** POST /api/orders — pedido del Store; anónimo o del comprador logueado.
   *  Si `userId` viene asociado, el pedido queda enlazado a su cuenta
   *  (historial en /orders/mine). Reseva stock. */
  async create(
    dto: CreateOrderDto,
    meta?: { ip?: string; userAgent?: string; userId?: string | null },
  ) {
    const resolved = await this.resolveItems(dto.items);
    const totalAmount = resolved.reduce((sum, i) => sum + i.lineTotal, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      let customerId: string | null = null;
      const existing = await tx.customer.findFirst({
        where: { phone: dto.whatsappPhone },
        select: { id: true },
      });
      if (existing) {
        await tx.customer.update({
          where: { id: existing.id },
          data: { name: dto.name },
        });
        customerId = existing.id;
      } else {
        const created = await tx.customer.create({
          data: { name: dto.name, phone: dto.whatsappPhone },
        });
        customerId = created.id;
      }

      const createdOrder = await tx.order.create({
        data: {
          customerId,
          userId: meta?.userId ?? null,
          status: 'pending',
          totalAmount,
          whatsappPhone: dto.whatsappPhone,
          source: 'store',
          items: {
            create: resolved.map((i) => ({
              productVariantId: i.productVariantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
          },
        },
        include: orderDetailInclude,
      });

      for (const i of resolved) {
        await tx.inventory.update({
          where: { productVariantId: i.productVariantId },
          data: { reserved: { increment: i.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productVariantId: i.productVariantId,
            type: 'reserve',
            delta: i.quantity,
            stockBefore: i.stockOnHand,
            stockAfter: i.stockOnHand,
            reason: `Reserva por pedido ${createdOrder.id}`,
            refType: 'order',
            refId: createdOrder.id,
          },
        });
      }

      await this.auditService.record({
        action: 'order.create',
        entity: 'order',
        entityId: createdOrder.id,
        metadata: {
          source: 'store',
          itemCount: resolved.length,
          total: Number(totalAmount.toFixed(2)),
          ip: meta?.ip ?? null,
          userAgent: meta?.userAgent ?? null,
        },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        tx,
      });

      return createdOrder;
    });

    const response = this.toResponse(order);
    const message = buildOrderWhatsAppMessage({
      items: response.items.map((i) => ({
        name: i.name,
        material: i.material,
        size: i.size,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      totalAmount: response.totalAmount,
    });
    // El envío nunca debe tumbar la creación del pedido (el fake es síncrono).
    await this.whatsapp.send(response.whatsappPhone, message).catch((error) => {
      this.logger.warn(`No se pudo notificar por WhatsApp: ${String(error)}`);
    });
    return { ...response, whatsappLink: buildWhatsAppLink(message) };
  }

  /** GET /api/orders — listado admin (pedidos:ver), filtro opcional por estado. */
  async list(query: ListOrdersQuery) {
    const rows = await this.prisma.order.findMany({
      where: query.status ? { status: query.status } : {},
      include: orderDetailInclude,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    return rows.map((order) => this.toResponse(order));
  }

  /** GET /api/orders/mine — historial del comprador autenticado. */
  async listByUser(userId: string) {
    const rows = await this.prisma.order.findMany({
      where: { userId },
      include: orderDetailInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((order) => this.toResponse(order));
  }

  /** GET /api/orders/:id — detalle admin (pedidos:ver). */
  async getById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return this.toResponse(order);
  }

  /** PATCH /api/orders/:id/status — transición de estado con efectos en stock. */
  async updateStatus(id: string, dto: UpdateOrderStatusDto, actorUserId?: string) {
    const current = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { productVariant: { include: { inventory: true } } } },
      },
    });
    if (!current) throw new NotFoundException('Pedido no encontrado');
    if (current.status === dto.status) {
      throw new ConflictException(`El pedido ya está en estado ${dto.status}`);
    }
    const allowed = this.TRANSITIONS[current.status as Status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transición inválida: ${current.status} → ${dto.status}`,
      );
    }
    const from = current.status;
    const to = dto.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: to },
      });

      if (to === 'cancelled' && (from === 'pending' || from === 'confirmed')) {
        await this.releaseReservations(tx, id, current.items, 'Pedido cancelado');
      }
      if (to === 'completed' && from === 'confirmed') {
        await this.consumeStock(tx, id, current.items);
      }

      if (actorUserId) {
        await this.auditService.record({
          action: 'order.status',
          entity: 'order',
          entityId: id,
          actorUserId,
          metadata: { from, to },
          tx,
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: orderDetailInclude,
      });
    });

    return this.toResponse(updated);
  }

  /** Valida variantes y calcula precios server-side (S-06) + no-sobreventa. */
  private async resolveItems(
    items: CreateOrderDto['items'],
  ): Promise<
    {
      productVariantId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      stockOnHand: number;
      name: string;
      material: string;
      size: string;
    }[]
  > {
    const resolved = [];
    for (const item of items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.productVariantId },
        include: {
          inventory: true,
          product: {
            select: { id: true, name: true, basePrice: true, isActive: true },
          },
        },
      });
      if (!variant) {
        throw new NotFoundException('Uno de los productos del pedido no está disponible');
      }
      if (variant.status !== 'active' || !variant.product.isActive) {
        throw new ConflictException(`La variante ${variant.sku} no está disponible`);
      }
      const stockOnHand = variant.inventory?.stockOnHand ?? 0;
      const reserved = variant.inventory?.reserved ?? 0;
      const available = stockOnHand - reserved;
      if (item.quantity > available) {
        throw new ConflictException(
          `Stock insuficiente para ${variant.sku} (disponible: ${available})`,
        );
      }
      const unitPrice = Number(variant.priceOverride ?? variant.product.basePrice);
      resolved.push({
        productVariantId: variant.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
        stockOnHand,
        name: variant.product.name,
        material: variant.material,
        size: variant.size,
      });
    }
    return resolved;
  }

  /** Cancelación: libera la reserva (reserved −= qty) con ledger `release`. */
  private async releaseReservations(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: OrderWithItemsForStock['items'],
    reason: string,
  ) {
    for (const item of items) {
      const stockOnHand = item.productVariant.inventory?.stockOnHand ?? 0;
      await tx.inventory.update({
        where: { productVariantId: item.productVariant.id },
        data: { reserved: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productVariantId: item.productVariant.id,
          type: 'release',
          delta: -item.quantity,
          stockBefore: stockOnHand,
          stockAfter: stockOnHand,
          reason,
          refType: 'order',
          refId: orderId,
        },
      });
    }
  }

  /** Completado: consume stock (stockOnHand −= qty y reserved −= qty). */
  private async consumeStock(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: OrderWithItemsForStock['items'],
  ) {
    for (const item of items) {
      const stockOnHand = item.productVariant.inventory?.stockOnHand ?? 0;
      await tx.inventory.update({
        where: { productVariantId: item.productVariant.id },
        data: {
          stockOnHand: { decrement: item.quantity },
          reserved: { decrement: item.quantity },
        },
      });
      await tx.stockMovement.create({
        data: {
          productVariantId: item.productVariant.id,
          type: 'release',
          delta: -item.quantity,
          stockBefore: stockOnHand,
          stockAfter: stockOnHand - item.quantity,
          reason: 'Pedido completado (venta)',
          refType: 'order',
          refId: orderId,
        },
      });
    }
  }

  /** Normaliza un registro de BD a la respuesta del API. */
  private toResponse(order: OrderDetail) {
    return {
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      whatsappPhone: order.whatsappPhone,
      source: order.source,
      customer: order.customer
        ? {
            id: order.customer.id,
            name: order.customer.name,
            phone: order.customer.phone,
          }
        : null,
      items: order.items.map((i) => ({
        id: i.id,
        productVariantId: i.productVariantId,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
        name: i.productVariant.product.name,
        material: i.productVariant.material,
        size: i.productVariant.size,
        imageUrl: i.productVariant.product.images[0]?.url ?? null,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}