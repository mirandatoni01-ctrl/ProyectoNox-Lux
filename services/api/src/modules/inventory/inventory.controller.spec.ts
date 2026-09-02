import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController (unit)', () => {
  let controller: InventoryController;
  const inventoryService = {
    list: jest.fn(),
    getByVariant: jest.fn(),
    setStock: jest.fn(),
    adjustStock: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: inventoryService }],
    }).compile();
    controller = module.get(InventoryController);
  });

  it('list → servicio con limit/default', async () => {
    await controller.list({ limit: 10 } as any);
    expect(inventoryService.list).toHaveBeenCalledWith(10);
  });

  it('list sin query usa undefined (default en servicio)', async () => {
    await controller.list();
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
  });

  it('get → getByVariant', async () => {
    await controller.get('v-1');
    expect(inventoryService.getByVariant).toHaveBeenCalledWith('v-1');
  });

  it('set → setStock con actor', async () => {
    await controller.set('v-1', { stockOnHand: 12 } as any, { userId: 'u-1' } as any);
    expect(inventoryService.setStock).toHaveBeenCalledWith('v-1', { stockOnHand: 12 }, 'u-1');
  });

  it('adjust → adjustStock con actor', async () => {
    await controller.adjust('v-1', { delta: -1 } as any, { userId: 'u-1' } as any);
    expect(inventoryService.adjustStock).toHaveBeenCalledWith('v-1', { delta: -1 }, 'u-1');
  });
});
