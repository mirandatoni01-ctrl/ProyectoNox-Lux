import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';

describe('UsersService (unit)', () => {
  let service: UsersService;
  const userFindMany = jest.fn();
  const userFindUnique = jest.fn();
  const userUpdate = jest.fn();
  const roleFindMany = jest.fn();
  const userRoleDeleteMany = jest.fn();
  const userRoleCreateMany = jest.fn();
  const auditRecord = jest.fn();
  const tx = jest.fn(async (input: unknown) => {
    if (typeof input === 'function') return input({});
    return input;
  });

  const prisma = {
    user: {
      findMany: userFindMany,
      findUnique: userFindUnique,
      update: userUpdate,
    },
    role: { findMany: roleFindMany },
    userRole: { deleteMany: userRoleDeleteMany, createMany: userRoleCreateMany },
    $transaction: tx,
  };
  const audit = { record: auditRecord };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('list mapea roles', async () => {
    userFindMany.mockResolvedValue([
      {
        id: 'u-1',
        email: 'a@x.com',
        fullName: 'A',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        roles: [{ role: { code: 'CUSTOMER' } }],
      },
    ]);
    const res = await service.list({});
    expect(res[0].roles).toEqual(['CUSTOMER']);
  });

  it('getById devuelve roles y permisos', async () => {
    userFindUnique.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      fullName: 'A',
      phone: null,
      isActive: true,
      provider: null,
      createdAt: new Date(),
      roles: [{ role: { code: 'ADMIN', permissions: [{ permission: { code: 'a' } }] } }],
    });
    const res = await service.getById('u-1');
    expect(res.roles).toEqual(['ADMIN']);
    expect(res.permissions).toContain('a');
  });

  it('getById lanza NotFound si no existe', async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(service.getById('u-x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update asigna roles', async () => {
    userFindUnique.mockResolvedValue({ id: 'u-1' });
    roleFindMany.mockResolvedValue([{ id: 'r-1', code: 'ADMIN' }]);
    userRoleDeleteMany.mockResolvedValue({ count: 0 });
    userRoleCreateMany.mockResolvedValue({ count: 1 });
    userFindUnique.mockResolvedValue({ id: 'u-1', email: 'a', roles: [], permissions: [] } as any);
    const res = await service.update('u-1', { roleCodes: ['ADMIN'] as any }, 'actor');
    expect(roleFindMany).toHaveBeenCalledWith({ where: { code: { in: ['ADMIN'] } }, select: { id: true, code: true } });
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: 'users.update' }));
    expect(res).toBeDefined();
  });

  it('update rechaza roles vacíos', async () => {
    userFindUnique.mockResolvedValue({ id: 'u-1' });
    await expect(
      service.update('u-1', { roleCodes: [] as any }, 'actor'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update lanza NotFound si el usuario no existe', async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(
      service.update('u-x', { isActive: false }, 'actor'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});