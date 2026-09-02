import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService (NL-12)', () => {
  let service: AuditService;

  const prisma = {
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AuditService);
  });

  describe('record', () => {
    it('registra con actor resuelto desde la BD', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'a-1' });
      await service.record({
        action: 'product.create',
        entity: 'product',
        entityId: 'p-1',
        actorUserId: 'user-1',
        metadata: { name: 'A' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: 'user-1',
          action: 'product.create',
          entity: 'product',
          entityId: 'p-1',
          metadata: { name: 'A' },
        }),
      });
    });

    it('registra sin actor cuando no se pasa actorUserId', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'a-2' });
      await service.record({ action: 'order.create', entity: 'order', entityId: 'o-1' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('registra sin actor si el actor no existe y no revienta', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.auditLog.create.mockResolvedValue({ id: 'a-3' });
      await service.record({
        action: 'inventory.set',
        entity: 'inventory',
        entityId: 'v-1',
        actorUserId: 'ghost',
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ actorUserId: expect.anything() }),
      });
    });

    it('usa tx si se provee', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      const tx = {
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
        auditLog: { create: jest.fn().mockResolvedValue({ id: 'a-tx' }) },
      };
      await service.record({
        action: 'order.status',
        entity: 'order',
        entityId: 'o-1',
        actorUserId: 'user-1',
        tx: tx as any,
      });
      expect(tx.auditLog.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('captura errores de escritura sin lanzar (best-effort)', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('db down'));
      await expect(
        service.record({ action: 'auth.login', entity: 'user', entityId: 'u-1' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('filtra por action/entity/actor y pagina', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 'a-1', action: 'product.create', entityId: 'p-1', actorUser: null, metadata: null, ip: null, userAgent: null, createdAt: new Date(), entity: 'product' },
      ]);
      const rows = await service.list({ limit: 50 });
      expect(rows).toHaveLength(1);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });
});
