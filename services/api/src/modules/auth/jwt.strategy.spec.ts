import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('JwtStrategy (unit / NL-12)', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  };

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET;
  });

  const build = async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [JwtStrategy, { provide: PrismaService, useValue: prisma }],
    }).compile();
    return module.get(JwtStrategy);
  };

  it('valida un JWT con un usuario activo y devuelve roles/permisos', async () => {
    process.env.JWT_ACCESS_SECRET = 'console-login-NL12-very-long-secret-for-tests';
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      isActive: true,
      roles: [
        { role: { code: 'ADMIN', permissions: [{ permission: { code: 'productos:ver' } }] } },
      ],
    });
    const strategy = await build();
    const user = await strategy.validate({ sub: 'u-1', email: 'a@x.com' });
    expect(user.userId).toBe('u-1');
    expect(user.permissions).toEqual(['productos:ver']);
  });

  it('rechaza un usuario inactivo o inexistente', async () => {
    process.env.JWT_ACCESS_SECRET = 'console-login-NL12-very-long-secret-for-tests';
    prisma.user.findUnique.mockResolvedValue(null);
    const strategy = await build();
    await expect(strategy.validate({ sub: 'u-1', email: 'a@x.com' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un usuario inactivo (isActive=false)', async () => {
    process.env.JWT_ACCESS_SECRET = 'console-login-NL12-very-long-secret-for-tests';
    prisma.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'a', isActive: false, roles: [] });
    const strategy = await build();
    await expect(strategy.validate({ sub: 'u-1', email: 'a' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
