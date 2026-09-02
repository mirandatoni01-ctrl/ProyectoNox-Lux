import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { MediaService } from '../media/media.service';

describe('ProductsController (unit)', () => {
  let controller: ProductsController;
  const productsService = {
    listActive: jest.fn(),
    listAdmin: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    toggleActive: jest.fn(),
    remove: jest.fn(),
    removeImage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: MediaService, useValue: {} },
      ],
    }).compile();
    controller = module.get(ProductsController);
  });

  it('catalog → listActive', async () => {
    productsService.listActive.mockResolvedValue([]);
    await controller.catalog();
    expect(productsService.listActive).toHaveBeenCalled();
  });

  it('list → listAdmin con query+limit', async () => {
    await controller.list({ category: 'anillos', limit: 25 } as any);
    expect(productsService.listAdmin).toHaveBeenCalledWith({
      category: 'anillos',
      limit: 25,
    });
  });

  it('get → getById', async () => {
    await controller.get('p-1');
    expect(productsService.getById).toHaveBeenCalledWith('p-1');
  });

  it('create → pasando actor', async () => {
    await controller.create({ name: 'A' } as any, { userId: 'u-1' } as any);
    expect(productsService.create).toHaveBeenCalledWith({ name: 'A' }, 'u-1');
  });

  it('update → pasando actor', async () => {
    await controller.update('p-1', { name: 'B' } as any, { userId: 'u-1' } as any);
    expect(productsService.update).toHaveBeenCalledWith('p-1', { name: 'B' }, 'u-1');
  });

  it('toggle → pasando actor', async () => {
    await controller.toggle('p-1', { userId: 'u-1' } as any);
    expect(productsService.toggleActive).toHaveBeenCalledWith('p-1', 'u-1');
  });

  it('remove → pasando actor', async () => {
    await controller.remove('p-1', { userId: 'u-1' } as any);
    expect(productsService.remove).toHaveBeenCalledWith('p-1', 'u-1');
  });

  it('removeImage → pasando actor', async () => {
    await controller.removeImage('p-1', 'img-1', { userId: 'u-1' } as any);
    expect(productsService.removeImage).toHaveBeenCalledWith('p-1', 'img-1', 'u-1');
  });
});
