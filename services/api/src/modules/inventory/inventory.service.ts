import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdjustStockDto, SetStockDto } from './dto/inventory.dto';
import { DEFAULT_LIST_LIMIT } from '../../common/validation/pagination';

/**
 * Inventario y stock (NL-08).
 * Fuente de verdad PostgreSQL. Cada escritura de `stockOnHand`:
 *   1. actualiza (o crea) la fila de Inventory por variante,
 *   2. registra un movimiento en StockMovement (ledger, trazabilidad),
 *   3. deja rastro en AuditLog (SECURITY_MODEL: cambios de stock auditables).
 * `reserved` se expone solo de lectura; la reserva real llega con los pedidos
 * (NL-10). available = stockOnHand − reserved.
 */
const variantInclude = {
  inventory: true,
  product: { select: { id: true, name: true } },
} satisfies Prisma.ProductVariantInclude;

type StockVariant = Prisma.ProductVariantGetPayload<{
  include: typeof variantInclude;
}>;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Listado de stock de todas las variantes (incluye variantes sin fila → 0). */
  async list(limit: number = DEFAULT_LIST_LIMIT) {
    const rows = await this.prisma.productVariant.findMany({
      include: variantInclude,
      orderBy: { sku: 'asc' },
      take: limit,
    });
    return rows.map((row) => this.toEntry(row));
  }

  async getByVariant(variantId: string) {
    const row = await this.findVariant(variantId);
    return this.toEntry(row);
  }

  /** Fija stockOnHand a un valor absoluto (no negativo). */
  async setStock(variantId: string, dto: SetStockDto, actorUserId?: string) {
    const current = await this.getByVariant(variantId);
    if (current.stockOnHand === dto.stockOnHand) {
      return current;
    }
    const delta = dto.stockOnHand - current.stockOnHand;
    await this.applyWrite({
      variantId,
      type: 'set',
      action: 'inventory.set',
      before: current.stockOnHand,
      after: dto.stockOnHand,
      delta,
      reason: dto.reason,
      actorUserId,
    });
    return this.getByVariant(variantId);
  }

  /** Aplica un delta (±); el stock no puede quedar negativo (409). */
  async adjustStock(variantId: string, dto: AdjustStockDto, actorUserId?: string) {
    const current = await this.getByVariant(variantId);
    const after = current.stockOnHand + dto.delta;
    if (after < 0) {
      throw new ConflictException(
        `El stock de la variante ${variantId} no puede quedar negativo (${after})`,
      );
    }
    await this.applyWrite({
      variantId,
      type: 'adjust',
      action: 'inventory.adjust',
      before: current.stockOnHand,
      after,
      delta: dto.delta,
      reason: dto.reason,
      actorUserId,
    });
    return this.getByVariant(variantId);
  }

  private async findVariant(variantId: string): Promise<StockVariant> {
    const row = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: variantInclude,
    });
    if (!row) {
      throw new NotFoundException('Variante no encontrada');
    }
    return row;
  }

  private async applyWrite(args: {
    variantId: string;
    type: 'initial' | 'set' | 'adjust';
    action: string;
    before: number;
    after: number;
    delta: number;
    reason?: string;
    actorUserId?: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.inventory.upsert({
        where: { productVariantId: args.variantId },
        update: { stockOnHand: args.after },
        create: {
          productVariantId: args.variantId,
          stockOnHand: args.after,
          reserved: 0,
        },
      });
      await tx.stockMovement.create({
        data: {
          productVariantId: args.variantId,
          type: args.type,
          delta: args.delta,
          stockBefore: args.before,
          stockAfter: args.after,
          reason: args.reason,
        },
      });
      if (args.actorUserId) {
        await this.auditService.record({
          action: args.action,
          entity: 'inventory',
          entityId: args.variantId,
          actorUserId: args.actorUserId,
          metadata: {
            before: args.before,
            after: args.after,
            delta: args.delta,
            reason: args.reason ?? null,
          },
          tx,
        });
      }
    });
  }

  private toEntry(row: StockVariant) {
    const stockOnHand = row.inventory?.stockOnHand ?? 0;
    const reserved = row.inventory?.reserved ?? 0;
    return {
      productVariantId: row.id,
      sku: row.sku,
      productId: row.product.id,
      productName: row.product.name,
      material: row.material,
      size: row.size,
      status: row.status,
      stockOnHand,
      reserved,
      available: stockOnHand - reserved,
    };
  }
}