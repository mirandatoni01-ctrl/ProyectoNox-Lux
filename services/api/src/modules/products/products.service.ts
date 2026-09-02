import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { AuditService } from '../audit/audit.service';
import {
  type CreateProductDto,
  type ListProductsQuery,
  type UpdateProductDto,
} from './dto/product.dto';

/**
 * CRUD de productos y variantes (NL-07). Imágenes múltiples desde NL-09:
 * `images[]` reemplaza la galería (ProductImage); `imageUrl` se mantiene como
 * compat → mapea a la imagen primaria. Fuente de verdad: PostgreSQL
 * (ADR-NL-003/005). El inventario/stock es NL-08; aquí solo se lee (relación
 * Inventory) si existe.
 */
const productInclude = {
  variants: { include: { inventory: true } },
  images: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly auditService: AuditService,
  ) {}

  private static slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private static toVariantSku(base: string, productId: string, index: number): string {
    const token = `${productId.slice(0, 8)}${Date.now().toString(36)}`.slice(-6).toUpperCase();
    return `${base.toUpperCase().slice(0, 12) || 'NOX'}-${token}-${index + 1}`;
  }

  /** Catálogo público para el Store: solo productos activos (NL-07 "lectura store"). */
  async listActive() {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true },
      include: productInclude,
      orderBy: { createdAt: 'asc' },
      take: ProductsService.PUBLIC_CATALOG_MAX,
    });
    return rows.map((p) => this.toResponse(p));
  }

  /** Tope defensivo del catálogo público (NL-12, evita lecturas sin límite). */
  private static readonly PUBLIC_CATALOG_MAX = 500;

  /** Listado admin (incluye inactivos) con filtros opcionales. */
  async listAdmin(query: ListProductsQuery) {
    const rows = await this.prisma.product.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' } }
          : {}),
      },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    return rows.map((p) => this.toResponse(p));
  }

  async getById(id: string) {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!row) throw new NotFoundException('Producto no encontrado');
    return this.toResponse(row);
  }

  async create(dto: CreateProductDto, actorUserId?: string) {
    const base = ProductsService.slugify(dto.name) || 'producto';
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name: dto.name,
            slug: base,
            category: dto.category,
            description: dto.description,
            basePrice: dto.basePrice,
            materialDefault: dto.materialDefault,
            isActive: dto.isActive,
            variants: {
              create: dto.variants.map((v, i) => ({
                sku: ProductsService.toVariantSku(base, `new-${i}`, i),
                material: v.material,
                size: v.size,
                priceOverride: v.priceOverride,
                status: 'active',
                ...(v.stock && v.stock > 0
                  ? {
                      inventory: {
                        create: { stockOnHand: v.stock, reserved: 0 },
                      },
                    }
                  : {}),
              })),
            },
          },
        });
        const imageList = ProductsService.resolveImages(dto.images, dto.imageUrl, dto.name);
        for (const [i, img] of imageList.entries()) {
          await tx.productImage.create({
            data: {
              productId: created.id,
              url: img.url,
              alt: img.alt ?? dto.name,
              position: img.position ?? i,
              isPrimary:
                img.isPrimary ?? (imageList.some((x) => x.isPrimary) ? false : i === 0),
            },
          });
        }
        const full = await tx.product.findUniqueOrThrow({
          where: { id: created.id },
          include: productInclude,
        });
        // Ledger: stock inicial de las variantes (NL-08).
        for (const variant of full.variants) {
          const stock = variant.inventory?.stockOnHand ?? 0;
          if (stock > 0) {
            await tx.stockMovement.create({
              data: {
                productVariantId: variant.id,
                type: 'initial',
                delta: stock,
                stockBefore: 0,
                stockAfter: stock,
                reason: 'Alta de producto',
              },
            });
          }
        }
        return full;
      });
      if (actorUserId) {
        await this.auditService.record({
          action: 'product.create',
          entity: 'product',
          entityId: product.id,
          actorUserId,
          metadata: { name: product.name },
        });
      }
      return this.toResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un producto con el mismo slug (nombre)');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto, actorUserId?: string) {
    await this.getById(id);
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        // Reemplazo completo de la lista de variantes (decisión NL-07). Su
        // inventario asociado se elimina en cascada; el stock puede reenviarse
        // con cada variante (NL-08) y se registra como ledger.
        if (dto.variants) {
          const skuBase =
            (dto.name ? ProductsService.slugify(dto.name) : undefined) ??
            (await tx.product.findUnique({ where: { id } }))?.slug ??
            'NOX';
          await tx.productVariant.deleteMany({ where: { productId: id } });
          for (const [i, v] of dto.variants.entries()) {
            const variant = await tx.productVariant.create({
              data: {
                productId: id,
                sku: ProductsService.toVariantSku(skuBase, id, i),
                material: v.material,
                size: v.size,
                priceOverride: v.priceOverride,
                status: 'active',
              },
            });
            if (v.stock && v.stock > 0) {
              await tx.inventory.create({
                data: { productVariantId: variant.id, stockOnHand: v.stock, reserved: 0 },
              });
              await tx.stockMovement.create({
                data: {
                  productVariantId: variant.id,
                  type: 'initial',
                  delta: v.stock,
                  stockBefore: 0,
                  stockAfter: v.stock,
                  reason: 'Alta de variante',
                },
              });
            }
          }
        }
        await tx.product.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.category !== undefined ? { category: dto.category } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
            ...(dto.materialDefault !== undefined
              ? { materialDefault: dto.materialDefault }
              : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        });
        // Reemplazo completo de la galería: `images[]` manda; `imageUrl` queda
        // como compat → imagen primaria. Los blobs locales retirados se borran.
        if (dto.images || dto.imageUrl !== undefined) {
          const imageList = ProductsService.resolveImages(dto.images, dto.imageUrl, dto.name);
          const existing = await tx.productImage.findMany({ where: { productId: id } });
          const keptUrls = new Set(imageList.map((img) => img.url));
          await tx.productImage.deleteMany({ where: { productId: id } });
          for (const [i, img] of imageList.entries()) {
            await tx.productImage.create({
              data: {
                productId: id,
                url: img.url,
                alt: img.alt ?? dto.name,
                position: img.position ?? i,
                isPrimary:
                  img.isPrimary ?? (imageList.some((x) => x.isPrimary) ? false : i === 0),
              },
            });
          }
          for (const img of existing) {
            if (!keptUrls.has(img.url)) {
              await this.mediaService.removeByUrl(img.url).catch(() => undefined);
            }
          }
        }
        return tx.product.findUniqueOrThrow({
          where: { id },
          include: productInclude,
        });
      });
      if (actorUserId) {
        await this.auditService.record({
          action: 'product.update',
          entity: 'product',
          entityId: id,
          actorUserId,
          metadata: { name: dto.name ?? undefined },
        });
      }
      return this.toResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('SKU duplicado al reemplazar variantes');
      }
      throw error;
    }
  }

  /** Alta/baja lógica (el Store usa isActive=false como ocultar). */
  async toggleActive(id: string, actorUserId?: string) {
    const current = await this.getById(id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive: !current.isActive },
      include: productInclude,
    });
    if (actorUserId) {
      await this.auditService.record({
        action: 'product.toggle',
        entity: 'product',
        entityId: id,
        actorUserId,
        metadata: { isActive: updated.isActive },
      });
    }
    return this.toResponse(updated);
  }

  /** Borrado físico con cascada de variantes e imágenes (productos:eliminar). */
  async remove(id: string, actorUserId?: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
      if (actorUserId) {
        await this.auditService.record({
          action: 'product.delete',
          entity: 'product',
          entityId: id,
          actorUserId,
          metadata: {},
        });
      }
      return { id, deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Producto no encontrado');
      }
      throw error;
    }
  }

  /** Elimina una imagen concreta del producto y su blob si es media local. */
  async removeImage(productId: string, imageId: string, actorUserId?: string) {
    const row = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!row) {
      throw new NotFoundException('Imagen no encontrada');
    }
    await this.prisma.productImage.delete({ where: { id: row.id } });
    await this.mediaService.removeByUrl(row.url, actorUserId).catch(() => undefined);
    return { id: row.id, deleted: true };
  }

  private static resolveImages(
    images: { url: string; alt?: string; position?: number; isPrimary?: boolean }[] | undefined,
    imageUrl: string | undefined,
    nameFallback: string | undefined,
  ): { url: string; alt?: string; position?: number; isPrimary?: boolean }[] {
    if (images && images.length > 0) return images;
    if (imageUrl) return [{ url: imageUrl, alt: nameFallback, position: 0, isPrimary: true }];
    return [];
  }

/** Normaliza el registro de BD a la respuesta del API. */
  private toResponse(p: ProductWithRelations) {
    const primary =
      p.images.find((img) => img.isPrimary) ?? p.images[0] ?? undefined;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      description: p.description,
      isActive: p.isActive,
      basePrice: Number(p.basePrice),
      materialDefault: p.materialDefault,
      imageUrl: primary?.url ?? null,
      images: p.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        position: img.position,
        isPrimary: img.isPrimary,
      })),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        material: v.material,
        size: v.size,
        priceOverride: v.priceOverride === null ? null : Number(v.priceOverride),
        status: v.status,
        stock: v.inventory?.stockOnHand ?? 0,
        reserved: v.inventory?.reserved ?? 0,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}