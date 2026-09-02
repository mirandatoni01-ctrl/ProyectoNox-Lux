import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TicketsService } from './tickets.service';

describe('TicketsService (unit)', () => {
  let service: TicketsService;
  const ticketCreate = jest.fn();
  const ticketFindMany = jest.fn();
  const ticketFindUnique = jest.fn();
  const ticketUpdate = jest.fn();
  const auditRecord = jest.fn();

  const prisma = {
    contactTicket: {
      create: ticketCreate,
      findMany: ticketFindMany,
      findUnique: ticketFindUnique,
      update: ticketUpdate,
    },
  };
  const audit = { record: auditRecord };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(TicketsService);
  });

  it('create persiste ticket y registra auditoría', async () => {
    ticketCreate.mockResolvedValue({ id: 't-1', status: 'new', createdAt: new Date() });
    await service.create(
      { name: 'N', email: 'n@x.com', phone: '57', subject: 'S', message: 'msg' },
      'u-1',
    );
    expect(ticketCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u-1', status: 'new' }) }),
    );
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: 'tickets.create' }));
  });

  it('list aplica filtro status', async () => {
    ticketFindMany.mockResolvedValue([]);
    await service.list({ status: 'new' });
    expect(ticketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'new' }) }),
    );
  });

  it('listByUser filtra por userId', async () => {
    ticketFindMany.mockResolvedValue([]);
    await service.listByUser('u-9');
    expect(ticketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-9' } }),
    );
  });

  it('updateStatus cambia estado y nota', async () => {
    ticketFindUnique.mockResolvedValue({ id: 't-1', status: 'new' });
    ticketUpdate.mockResolvedValue({ id: 't-1', status: 'resolved', adminNote: 'ok' });
    await service.updateStatus('t-1', { status: 'resolved', adminNote: 'ok' }, 'a');
    expect(ticketUpdate).toHaveBeenCalledWith({
      where: { id: 't-1' },
      data: { status: 'resolved', adminNote: 'ok' },
    });
  });

  it('updateStatus lanza NotFound si no existe', async () => {
    ticketFindUnique.mockResolvedValue(null);
    await expect(
      service.updateStatus('t-x', { status: 'closed' }, 'a'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});