import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from './orders.service';
import { WHATSAPP_PROVIDER } from './whatsapp/whatsapp';

describe('OrdersService (unit)', () => {
  let service: OrdersService;
  const whatsapp = { send: jest.fn(async () => ({ ok: true })) };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined), list: jest.fn() };

  const prisma = {
    productVariant: { findUnique: jest.fn() },
    customer: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    inventory: { update: jest.fn() },
    stockMovement: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    auditMock.record.mockClear();
    delete process.env.WHATSAPP_NUMBER;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: WHATSAPP_PROVIDER, useValue: whatsapp },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  const dto = {
    name: 'Juan Pérez',
    whatsappPhone: '573001234567',
    items: [{ productVariantId: 'variant-1', quantity: 2 }],
  };

  const makeVariant = (overrides: Record<string, unknown> = {}) => ({
    id: 'variant-1',
    sku: 'ANILLO-ABC-1',
    material: 'STAINLESS_STEEL',
    size: 'T18',
    status: 'active',
    product: { id: 'product-1', name: 'ANILLO TEST', basePrice: 45, isActive: true },
    inventory: { stockOnHand: 7, reserved: 2 },
    ...overrides,
  });

  const makeOrderDetail = (overrides: Record<string, unknown> = {}) => ({
    id: 'order-1',
    status: 'pending',
    totalAmount: 90,
    whatsappPhone: '573001234567',
    source: 'store',
    customer: { id: 'cust-2', name: 'Juan Pérez', phone: '573001234567' },
    items: [
      {
        id: 'oi-1',
        orderId: 'order-1',
        productVariantId: 'variant-1',
        quantity: 2,
        unitPrice: 45,
        lineTotal: 90,
        productVariant: {
          id: 'variant-1',
          material: 'STAINLESS_STEEL',
          size: 'T18',
          product: { id: 'product-1', name: 'ANILLO TEST', images: [] },
        },
      },
    ],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  const txMock = () => ({
    customer: prisma.customer,
    order: prisma.order,
    inventory: prisma.inventory,
    stockMovement: prisma.stockMovement,
    user: prisma.user,
    auditLog: prisma.auditLog,
  });

  const runTx = () => {
    prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) =>
      fn(txMock()),
    );
  };

  describe('create', () => {
    beforeEach(() => {
      prisma.productVariant.findUnique.mockResolvedValue(makeVariant());
      runTx();
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: 'cust-2', name: dto.name, phone: dto.whatsappPhone });
      prisma.order.create.mockResolvedValue(makeOrderDetail());
    });

    it('crea pedido pending, reserva stock, registra ledger reserve + auditoría y devuelve whatsappLink', async () => {
      const result = await service.create(dto, { ip: '::1', userAgent: 'jest' });

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'pending',
          totalAmount: 90,
          whatsappPhone: dto.whatsappPhone,
          source: 'store',
          items: {
            create: [
              { productVariantId: 'variant-1', quantity: 2, unitPrice: 45, lineTotal: 90 },
            ],
          },
        }),
        include: expect.anything(),
      });

      // Reserva y ledger
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { productVariantId: 'variant-1' },
        data: { reserved: { increment: 2 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productVariantId: 'variant-1',
          type: 'reserve',
          delta: 2,
          stockBefore: 7,
          stockAfter: 7,
          refType: 'order',
          refId: 'order-1',
        }),
      });

      // Auditoría anónima (sin actor)
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'order.create',
          entity: 'order',
          entityId: 'order-1',
          metadata: expect.objectContaining({ source: 'store', ip: '::1', userAgent: 'jest' }),
        }),
      );

      // Cliente nuevo
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: { name: dto.name, phone: dto.whatsappPhone },
      });

      // WhatsApp notificado y enlace wa.me del negocio
      expect(whatsapp.send).toHaveBeenCalledWith(
        dto.whatsappPhone,
        expect.stringContaining('*NUEVO PEDIDO - NOX & LUX*'),
      );
      expect(result.id).toBe('order-1');
      expect(result.totalAmount).toBe(90);
      expect(result.whatsappLink).toMatch(/^https:\/\/wa\.me\//);
    });

    it('reutiliza el cliente existente por teléfono (update, sin crear)', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', name: 'X', phone: dto.whatsappPhone });
      await service.create(dto);
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { name: dto.name },
      });
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('lanza 404 si la variante no existe', async () => {
      prisma.productVariant.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('lanza 409 si la variante o el producto están inactivos', async () => {
      prisma.productVariant.findUnique.mockResolvedValueOnce(
        makeVariant({ status: 'hidden' }),
      );
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza 409 por no-sobreventa (qty > available = on_hand − reserved)', async () => {
      prisma.productVariant.findUnique.mockResolvedValueOnce(
        makeVariant({ inventory: { stockOnHand: 7, reserved: 2 } }),
      );
      await expect(
        service.create({ ...dto, items: [{ productVariantId: 'variant-1', quantity: 6 }] }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const currentOrder = (status: string) => ({
      id: 'order-1',
      status,
      items: [
        {
          id: 'oi-1',
          productVariantId: 'variant-1',
          quantity: 2,
          productVariant: { id: 'variant-1', inventory: { stockOnHand: 7 } },
        },
      ],
    });

    beforeEach(() => {
      runTx();
      prisma.order.findUniqueOrThrow.mockResolvedValue(makeOrderDetail());
    });

    it('pending → confirmed: solo cambia el estado (no toca stock)', async () => {
      prisma.order.findUnique.mockResolvedValue(currentOrder('pending'));
      const result = await service.updateStatus('order-1', { status: 'confirmed' }, 'user-1');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'confirmed' },
      });
      expect(prisma.inventory.update).not.toHaveBeenCalled();
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
      expect(result.status).toBe('pending'); // mock devuelve el detalle sin mutación
    });

    it('pending → cancelled: libera reserva (release) y audita con actor', async () => {
      prisma.order.findUnique.mockResolvedValue(currentOrder('pending'));
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      await service.updateStatus('order-1', { status: 'cancelled' }, 'user-1');

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { productVariantId: 'variant-1' },
        data: { reserved: { decrement: 2 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'release',
          delta: -2,
          stockBefore: 7,
          stockAfter: 7,
          refType: 'order',
          refId: 'order-1',
        }),
      });
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'user-1',
          action: 'order.status',
          entityId: 'order-1',
          metadata: { from: 'pending', to: 'cancelled' },
        }),
      );
    });

    it('confirmed → completed: consume stock (on_hand −= y reserved −=)', async () => {
      prisma.order.findUnique.mockResolvedValue(currentOrder('confirmed'));
      await service.updateStatus('order-1', { status: 'completed' });
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { productVariantId: 'variant-1' },
        data: { stockOnHand: { decrement: 2 }, reserved: { decrement: 2 } },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'release',
          delta: -2,
          stockBefore: 7,
          stockAfter: 5,
          refType: 'order',
          refId: 'order-1',
        }),
      });
    });

    it('lanza 400 para transiciones inválidas', async () => {
      prisma.order.findUnique.mockResolvedValue(currentOrder('pending'));
      await expect(
        service.updateStatus('order-1', { status: 'completed' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updateStatus('order-1', { status: 'cancelled' }),
      ).resolves.toBeDefined();
    });

    it('lanza 400 si el estado es terminal (completed no transiciona)', async () => {
      prisma.order.findUnique.mockResolvedValue(currentOrder('completed'));
      await expect(
        service.updateStatus('order-1', { status: 'cancelled' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza 409 si el pedido ya está en ese estado', async () => {
      prisma.order.findUnique.mockResolvedValue(currentOrder('pending'));
      await expect(
        service.updateStatus('order-1', { status: 'pending' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza 404 si el pedido no existe', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('ghost', { status: 'confirmed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list / getById', () => {
    it('list filtra por estado y normaliza la respuesta', async () => {
      prisma.order.findMany.mockResolvedValue([makeOrderDetail()]);
      const rows = await service.list({ status: 'pending' });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'pending' } }),
      );
      expect(rows[0]).toMatchObject({
        id: 'order-1',
        status: 'pending',
        totalAmount: 90,
        customer: { id: 'cust-2', name: 'Juan Pérez' },
        items: [
          {
            productVariantId: 'variant-1',
            quantity: 2,
            unitPrice: 45,
            name: 'ANILLO TEST',
            material: 'STAINLESS_STEEL',
            size: 'T18',
          },
        ],
      });
    });

    it('getById lanza 404 si no existe', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.getById('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});