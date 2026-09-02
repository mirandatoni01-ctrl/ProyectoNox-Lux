import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController (unit)', () => {
  let controller: UsersController;
  const usersService = {
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();
    controller = module.get(UsersController);
  });

  it('list pasa filtros parseados', async () => {
    usersService.list.mockResolvedValue([]);
    await controller.list('mar', 'ADMIN', 'true');
    expect(usersService.list).toHaveBeenCalledWith({
      q: 'mar',
      roleCode: 'ADMIN',
      isActive: true,
    });
  });

  it('get delega en getById', async () => {
    await controller.get('u-1');
    expect(usersService.getById).toHaveBeenCalledWith('u-1');
  });

  it('update pasa dto parseado + actor', async () => {
    usersService.update.mockResolvedValue({ id: 'u-2' });
    await controller.update(
      'u-2',
      { roleCodes: ['ADMIN'], isActive: true },
      { userId: 'super' } as any,
    );
    expect(usersService.update).toHaveBeenCalledWith(
      'u-2',
      { roleCodes: ['ADMIN'], isActive: true },
      'super',
    );
  });

  it('update rechaza autocambio de rol', () => {
    expect(() =>
      controller.update('u-3', { roleCodes: ['SUPER_ADMIN'] }, { userId: 'u-3' } as any),
    ).toThrow(BadRequestException);
    expect(usersService.update).not.toHaveBeenCalled();
  });
});