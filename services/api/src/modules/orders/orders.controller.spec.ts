import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { WHATSAPP_PROVIDER } from './whatsapp/whatsapp';

describe('OrdersController (unit)', () => {
  let controller: OrdersController;
  const ordersService = {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    updateStatus: jest.fn(),
    listByUser: jest.fn(),
  };
  const req = () =>
    ({
      ip: '1.2.3.4',
      socket: { remoteAddress: '1.2.3.4' },
      headers: { 'user-agent': 'agent' },
    }) as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: WHATSAPP_PROVIDER, useValue: {} },
      ],
    }).compile();
    controller = module.get(OrdersController);
  });

  it('create pasa dto + ip/userAgent (anónimo, sin userId)', async () => {
    await controller.create({ name: 'X' } as any, req(), null);
    expect(ordersService.create).toHaveBeenCalledWith(
      { name: 'X' },
      { ip: '1.2.3.4', userAgent: 'agent', userId: null },
    );
  });

  it('create asocia userId del comprador logueado', async () => {
    await controller.create({ name: 'X' } as any, req(), { userId: 'u-9' } as any);
    expect(ordersService.create).toHaveBeenCalledWith(
      { name: 'X' },
      { ip: '1.2.3.4', userAgent: 'agent', userId: 'u-9' },
    );
  });

  it('mine delega en listByUser', async () => {
    await controller.mine({ userId: 'u-42' } as any);
    expect(ordersService.listByUser).toHaveBeenCalledWith('u-42');
  });

  it('list pasa query con limit', async () => {
    await controller.list({ status: 'pending', limit: 20 } as any);
    expect(ordersService.list).toHaveBeenCalledWith({ status: 'pending', limit: 20 });
  });

  it('get delega', async () => {
    await controller.get('o-1');
    expect(ordersService.getById).toHaveBeenCalledWith('o-1');
  });

  it('updateStatus pasa actor', async () => {
    await controller.updateStatus('o-1', { status: 'cancelled' } as any, { userId: 'u-1' } as any);
    expect(ordersService.updateStatus).toHaveBeenCalledWith('o-1', { status: 'cancelled' }, 'u-1');
  });
});
