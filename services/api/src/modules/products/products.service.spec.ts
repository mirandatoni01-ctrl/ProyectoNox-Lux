import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { AuditService } from '../audit/audit.service';
import { ProductsService } from './products.service';

describe('ProductsService (unit)', () => {
  let service: ProductsService;
  let mediaServiceMock: { removeByUrl: jest.Mock };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined), list: jest.fn() };

  const makeVariant = (overrides: Record<string, unknown> = {}) => ({
    id: 'variant-1',
    sku: 'ANILLO-ABC123-1',
    material: 'STAINLESS_STEEL',
    size: 'T18',
    priceOverride: null,
    status: 'active',
    inventory: null,
    ...overrides,
  });

  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'product-1',
    name: 'ANILLO TEST',
    slug: 'anillo-test',
    category: 'anillos',
    description: 'desc',
    isActive: true,
    basePrice: 10,
    materialDefault: 'STAINLESS_STEEL',
    images: [],
    variants: [makeVariant()],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  const prisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productVariant: { deleteMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    productImage: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
    inventory: { create: jest.fn(), upsert: jest.fn() },
    stockMovement: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    auditMock.record.mockClear();
    mediaServiceMock = { removeByUrl: jest.fn(async () => true) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaService, useValue: mediaServiceMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  const makeKnownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError(`error ${code}`, {
      code,
      clientVersion: 'test',
    });

  describe('listActive', () => {
    it('devuelve solo productos activos y los normaliza', async () => {
      prisma.product.findMany.mockResolvedValue([
        makeRow(),
        makeRow({ id: 'product-2', isActive: false }),
      ]);
      const rows = await service.listActive();
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ id: 'product-1', name: 'ANILLO TEST' });
      expect(rows[0].variants[0].stock).toBe(0);
    });

    it('expone stock si la variante tiene inventario', async () => {
      prisma.product.findMany.mockResolvedValue([
        makeRow({
          variants: [makeVariant({ inventory: { stockOnHand: 7, reserved: 2 } })],
        }),
      ]);
      const [row] = await service.listActive();
      expect(row.variants[0].stock).toBe(7);
      expect(row.variants[0].reserved).toBe(2);
    });
  });

  describe('listAdmin', () => {
    it('aplica categoría y búsqueda', async () => {
      prisma.product.findMany.mockResolvedValue([makeRow()]);
      await service.listAdmin({ category: 'anillos', search: 'TEST' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            category: 'anillos',
            name: { contains: 'TEST', mode: 'insensitive' },
          },
        }),
      );
    });
  });

  describe('getById', () => {
    it('devuelve el producto normalizado', async () => {
      prisma.product.findUnique.mockResolvedValue(makeRow());
      const row = await service.getById('product-1');
      expect(row.id).toBe('product-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.getById('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('crea producto con variantes e imagen en transacción', async () => {
      const created = { id: 'product-new' };
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          product: {
            create: jest.fn(async () => created),
            findUniqueOrThrow: jest.fn(async () => makeRow({ id: 'product-new' })),
          },
          productImage: { create: jest.fn(async () => ({ id: 'img-1' })) },
        }),
      );
      const result = await service.create({
        name: 'ANILLO TEST',
        category: 'anillos',
        description: 'desc',
        basePrice: 10,
        materialDefault: 'STAINLESS_STEEL',
        isActive: true,
        imageUrl: 'https://img/1.jpg',
        variants: [
          { material: 'STAINLESS_STEEL', size: 'T18', priceOverride: 9.5 },
        ],
      });
      expect(result.id).toBe('product-new');
      expect(result.slug).toBe('anillo-test');
    });

    it('lanza ConflictException si el slug duplicado (P2002)', async () => {
      prisma.$transaction.mockImplementation(async () => {
        throw makeKnownError('P2002');
      });
      await expect(
        service.create({
          name: 'ANILLO TEST',
          category: 'anillos',
          description: '',
          basePrice: 10,
          materialDefault: 'STAINLESS_STEEL',
          isActive: true,
          variants: [],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea inventario inicial y movimiento para variantes con stock', async () => {
      const product = { id: 'product-new' };
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          product: {
            create: jest.fn(async () => product),
            findUniqueOrThrow: jest.fn(async () =>
              makeRow({
                variants: [
                  makeVariant({
                    id: 'variant-stock',
                    inventory: { stockOnHand: 5, reserved: 0 },
                  }),
                ],
              }),
            ),
          },
          productImage: { create: jest.fn(async () => ({ id: 'img-1' })) },
          stockMovement: { create: prisma.stockMovement.create },
        }),
      );
      const result = await service.create({
        name: 'ANILLO TEST',
        category: 'anillos',
        description: 'desc',
        basePrice: 10,
        materialDefault: 'STAINLESS_STEEL',
        isActive: true,
        variants: [{ material: 'STAINLESS_STEEL', size: 'T18', stock: 5 }],
      });
      expect(result.variants[0]).toMatchObject({ stock: 5, reserved: 0 });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productVariantId: 'variant-stock',
          type: 'initial',
          delta: 5,
          stockBefore: 0,
          stockAfter: 5,
        }),
      });
    });

    it('no registra movimiento si la variante no lleva stock', async () => {
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          product: {
            create: jest.fn(async () => ({ id: 'product-no-stock' })),
            findUniqueOrThrow: jest.fn(async () => makeRow({})),
          },
          productImage: { create: jest.fn(async () => ({ id: 'img-1' })) },
          stockMovement: prisma.stockMovement.create,
        }),
      );
      await service.create({
        name: 'ANILLO TEST',
        category: 'anillos',
        description: 'desc',
        basePrice: 10,
        materialDefault: 'STAINLESS_STEEL',
        isActive: true,
        variants: [{ material: 'STAINLESS_STEEL', size: 'T18' }],
      });
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('crea varias imágenes (images[]) con primaria honrada', async () => {
      const created: any[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          product: {
            create: jest.fn(async () => ({ id: 'product-new' })),
            findUniqueOrThrow: jest.fn(async () => makeRow({ id: 'product-new' })),
          },
          productImage: {
            create: jest.fn(async ({ data }: any) => {
              created.push(data);
              return { id: `img-${created.length}` };
            }),
          },
          stockMovement: prisma.stockMovement.create,
        }),
      );
      await service.create({
        name: 'ANILLO TEST',
        category: 'anillos',
        description: '',
        basePrice: 10,
        materialDefault: 'STAINLESS_STEEL',
        isActive: true,
        images: [
          { url: '/api/media/file/a.jpg' },
          { url: '/api/media/file/b.webp', isPrimary: true },
          { url: '/api/media/file/c.png' },
        ],
        variants: [],
      });
      expect(created).toHaveLength(3);
      expect(created.map((c) => c.url)).toEqual([
        '/api/media/file/a.jpg',
        '/api/media/file/b.webp',
        '/api/media/file/c.png',
      ]);
      expect(created[0].position).toBe(0);
      expect(created[0].alt).toBe('ANILLO TEST');
      expect(created[1].isPrimary).toBe(true);
      expect(created[0].isPrimary).toBe(false);
    });
  });

  describe('update', () => {
    it('reemplaza las variantes enteras y actualiza el producto', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(makeRow({ slug: 'anillo-test' })) // getById previo
        .mockResolvedValueOnce(makeRow()); // findUnique interno para skuBase
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: prisma.product.findUnique,
            update: prisma.product.update,
            findUniqueOrThrow: jest.fn(async () =>
              makeRow({ basePrice: 19.9, variants: [makeVariant(), makeVariant({ id: 'v2' })] }),
            ),
          },
          productVariant: {
            deleteMany: prisma.productVariant.deleteMany,
            create: jest.fn(async ({ data }: any) => ({
              id: 'variant-updated',
              ...data,
            })),
          },
          productImage: { findFirst: jest.fn(async () => null) },
        }),
      );
      prisma.product.update.mockResolvedValue(makeRow());
      prisma.productVariant.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.update('product-1', {
        basePrice: 19.9,
        variants: [
          { material: 'STAINLESS_STEEL', size: 'T18', priceOverride: 19 },
        ],
      });
      expect(prisma.productVariant.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
      });
      expect(result.basePrice).toBe(19.9);
      expect(result.variants).toHaveLength(2);
    });

    it('lanza NotFoundException si el producto no existe', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.update('ghost', { basePrice: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('reemplaza la galería (images[]) y borra los blobs locales huérfanos', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(makeRow({ slug: 'anillo-test' }))
        .mockResolvedValueOnce(makeRow());
      prisma.productImage.findMany.mockResolvedValue([
        { id: 'old-1', url: '/api/media/file/old.jpg' },
        { id: 'old-2', url: 'https://remoto/x.jpg' },
      ]);
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: prisma.product.findUnique,
            update: prisma.product.update,
            findUniqueOrThrow: jest.fn(async () =>
              makeRow({ images: [{ id: 'img-1', url: '/api/media/file/new.jpg' }] }),
            ),
          },
          productVariant: {
            deleteMany: prisma.productVariant.deleteMany,
            create: jest.fn(async ({ data }: any) => ({ id: 'variant-updated', ...data })),
          },
          productImage: {
            findMany: prisma.productImage.findMany,
            deleteMany: prisma.productImage.deleteMany,
            create: prisma.productImage.create,
          },
        }),
      );
      await service.update('product-1', {
        images: [{ url: '/api/media/file/new.jpg' }],
      });
      expect(prisma.productImage.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
      });
      expect(mediaServiceMock.removeByUrl).toHaveBeenCalledWith('/api/media/file/old.jpg');
    });

    it('crea inventario y movimiento al reemplazar variantes con stock', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(makeRow({ slug: 'anillo-test' }))
        .mockResolvedValueOnce(makeRow());
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: prisma.product.findUnique,
            update: prisma.product.update,
            findUniqueOrThrow: jest.fn(async () =>
              makeRow({
                variants: [
                  makeVariant({
                    id: 'variant-updated',
                    inventory: { stockOnHand: 8, reserved: 0 },
                  }),
                ],
              }),
            ),
          },
          productVariant: {
            deleteMany: prisma.productVariant.deleteMany,
            create: jest.fn(async ({ data }: any) => ({ id: 'variant-updated', ...data })),
          },
          productImage: { findFirst: jest.fn(async () => null) },
          inventory: { create: prisma.inventory.create },
          stockMovement: { create: prisma.stockMovement.create },
        }),
      );
      const result = await service.update('product-1', {
        variants: [{ material: 'RHODIUM', size: 'T20', stock: 8 }],
      });
      expect(result.variants[0].stock).toBe(8);
      expect(prisma.inventory.create).toHaveBeenCalledWith({
        data: { productVariantId: 'variant-updated', stockOnHand: 8, reserved: 0 },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productVariantId: 'variant-updated',
          type: 'initial',
          stockAfter: 8,
        }),
      });
    });
  });

  describe('toggleActive', () => {
    it('invierte isActive', async () => {
      prisma.product.findUnique.mockResolvedValue(makeRow({ isActive: true }));
      prisma.product.update.mockResolvedValue(makeRow({ isActive: false }));
      const result = await service.toggleActive('product-1');
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('elimina físicamente y responde deleted:true', async () => {
      prisma.product.delete.mockResolvedValue({ id: 'product-1' });
      const result = await service.remove('product-1');
      expect(result).toEqual({ id: 'product-1', deleted: true });
    });

    it('lanza NotFoundException si no existe (P2025)', async () => {
      prisma.product.delete.mockRejectedValue(makeKnownError('P2025'));
      await expect(service.remove('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeImage', () => {
    it('elimina la imagen y su blob local con el actor', async () => {
      prisma.productImage.findFirst.mockResolvedValue({
        id: 'img-1',
        productId: 'product-1',
        url: '/api/media/file/x.jpg',
      });
      prisma.productImage.delete.mockResolvedValue({ id: 'img-1' });
      const result = await service.removeImage('product-1', 'img-1', 'user-1');
      expect(prisma.productImage.findFirst).toHaveBeenCalledWith({
        where: { id: 'img-1', productId: 'product-1' },
      });
      expect(prisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
      expect(mediaServiceMock.removeByUrl).toHaveBeenCalledWith('/api/media/file/x.jpg', 'user-1');
      expect(result).toEqual({ id: 'img-1', deleted: true });
    });

    it('lanza NotFoundException si la imagen no existe o no pertenece al producto', async () => {
      prisma.productImage.findFirst.mockResolvedValue(null);
      await expect(
        service.removeImage('product-1', 'img-ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});