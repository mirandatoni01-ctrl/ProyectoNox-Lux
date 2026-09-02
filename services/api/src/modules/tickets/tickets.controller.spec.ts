import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController (unit)', () => {
  let controller: TicketsController;
  const ticketsService = {
    create: jest.fn(),
    list: jest.fn(),
    listByUser: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: ticketsService }],
    }).compile();
    controller = module.get(TicketsController);
  });

  it('create pasa dto + userId (logueado)', async () => {
    ticketsService.create.mockResolvedValue({ id: 't-1' });
    await controller.create(
      { name: 'N', email: 'n@x.com' } as any,
      { userId: 'u-1' } as any,
    );
    expect(ticketsService.create).toHaveBeenCalledWith(
      { name: 'N', email: 'n@x.com' },
      'u-1',
    );
  });

  it('create pasa userId null (anónimo)', async () => {
    await controller.create({ name: 'N' } as any, null);
    expect(ticketsService.create).toHaveBeenCalledWith({ name: 'N' }, null);
  });

  it('list pasa query', async () => {
    ticketsService.list.mockResolvedValue([]);
    await controller.list({ status: 'new' } as any);
    expect(ticketsService.list).toHaveBeenCalledWith({ status: 'new' });
  });

  it('mine delega en listByUser', async () => {
    await controller.mine({ userId: 'u-7' } as any);
    expect(ticketsService.listByUser).toHaveBeenCalledWith('u-7');
  });

  it('updateStatus pasa dto + actor', async () => {
    ticketsService.updateStatus.mockResolvedValue({ id: 't-2' });
    await controller.updateStatus(
      't-2',
      { status: 'resolved' } as any,
      { userId: 'admin' } as any,
    );
    expect(ticketsService.updateStatus).toHaveBeenCalledWith(
      't-2',
      { status: 'resolved' },
      'admin',
    );
  });
});