import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from './inventory.service';

describe('InventoryService (unit)', () => {
  let service: InventoryService;

  const prisma = {
    productVariant: { findMany: jest.fn(), findUnique: jest.fn() },
    inventory: { upsert: jest.fn() },
    stockMovement: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined), list: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    auditMock.record.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  const makeVariant = (overrides: Record<string, unknown> = {}) => ({
    id: 'variant-1',
    sku: 'ANILLO-ABC-1',
    material: 'STAINLESS_STEEL',
    size: 'T18',
    status: 'active',
    product: { id: 'product-1', name: 'ANILLO TEST' },
    inventory: { stockOnHand: 7, reserved: 2 },
    ...overrides,
  });

  const txMock = () => ({
    inventory: prisma.inventory,
    stockMovement: prisma.stockMovement,
    user: prisma.user,
    auditLog: prisma.auditLog,
  });

  describe('list', () => {
    it('devuelve todas las variantes con stock (0 si no hay fila de inventario)', async () => {
      prisma.productVariant.findMany.mockResolvedValue([
        makeVariant(),
        makeVariant({ id: 'variant-empty', inventory: null }),
      ]);
      const rows = await service.list();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        productVariantId: 'variant-1',
        sku: 'ANILLO-ABC-1',
        productName: 'ANILLO TEST',
        stockOnHand: 7,
        reserved: 2,
        available: 5,
      });
      expect(rows[1]).toMatchObject({ stockOnHand: 0, reserved: 0, available: 0 });
    });
  });

  describe('getByVariant', () => {
    it('normaliza la entrada (available = on_hand − reserved)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(makeVariant());
      const entry = await service.getByVariant('variant-1');
      expect(entry).toMatchObject({ stockOnHand: 7, reserved: 2, available: 5 });
    });

    it('lanza NotFoundException si la variante no existe', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      await expect(service.getByVariant('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('setStock', () => {
    it('no escribe nada si el valor ya es idéntico', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(makeVariant());
      const result = await service.setStock('variant-1', { stockOnHand: 7 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.stockOnHand).toBe(7);
    });

    it('actualiza inventory, registra movimiento y audita la acción', async () => {
      prisma.productVariant.findUnique
        .mockResolvedValueOnce(makeVariant()) // lectura previa
        .mockResolvedValueOnce(makeVariant({ inventory: { stockOnHand: 12, reserved: 2 } }));
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn(txMock()),
      );
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      const result = await service.setStock('variant-1', { stockOnHand: 12 }, 'user-1');
      expect(prisma.inventory.upsert).toHaveBeenCalledWith({
        where: { productVariantId: 'variant-1' },
        update: { stockOnHand: 12 },
        create: { productVariantId: 'variant-1', stockOnHand: 12, reserved: 0 },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productVariantId: 'variant-1',
          type: 'set',
          delta: 5,
          stockBefore: 7,
          stockAfter: 12,
        }),
      });
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'user-1',
          action: 'inventory.set',
          entity: 'inventory',
          entityId: 'variant-1',
        }),
      );
      expect(result.stockOnHand).toBe(12);
    });

    it('omite la auditoría si no hay actor', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(makeVariant());
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn(txMock()),
      );
      await service.setStock('variant-1', { stockOnHand: 12 });
      expect(auditMock.record).not.toHaveBeenCalled();
    });
  });

  describe('adjustStock', () => {
    it('aplica delta positivo con movimiento adjust', async () => {
      prisma.productVariant.findUnique
        .mockResolvedValueOnce(makeVariant())
        .mockResolvedValueOnce(makeVariant({ inventory: { stockOnHand: 10, reserved: 2 } }));
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
        fn(txMock()),
      );
      const result = await service.adjustStock('variant-1', { delta: 3 }, 'user-1');
      expect(prisma.inventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { stockOnHand: 10 } }),
      );
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'adjust', delta: 3, stockAfter: 10 }),
      });
      expect(result.stockOnHand).toBe(10);
    });

    it('lanza ConflictException si el stock quedaría negativo', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(makeVariant()); // 7
      await expect(
        service.adjustStock('variant-1', { delta: -10 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});