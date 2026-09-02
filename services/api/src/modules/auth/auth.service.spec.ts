import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Argon2Service } from '../../common/crypto/argon2.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from '../authorization/decorators/current-user.decorator';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let prisma: { user: any; refreshToken: any };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined), list: jest.fn() };

  const userRow = {
    id: 'user-1',
    email: 'admin@noxlux.test',
    passwordHash: 'argon2-hash:supersecretpass',
    fullName: 'Admin',
    isActive: true,
  };

  const userWithRoles = {
    ...userRow,
    roles: [{ role: { code: 'SUPER_ADMIN', permissions: [{ permission: { code: '*' } }] } }],
  };

  const storedTokens: Array<{
    id: string;
    tokenHash: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }> = [];

  const mockJwt = {
    signAsync: jest.fn(async (payload: unknown, opts: unknown) =>
      Promise.resolve(`signed.${JSON.stringify(payload)}.${String(opts)}`),
    ),
    verifyAsync: jest.fn(async (token: string) => {
      const match = /^signed\.(\{.+\})\.(.*)$/.exec(token);
      if (!match) throw new Error('bad token');
      return JSON.parse(match[1]);
    }),
  } as unknown as Partial<JwtService>;

  beforeEach(async () => {
    storedTokens.length = 0;
    prisma = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.email === 'admin@noxlux.test' || where.id === 'user-1') {
            return { ...userWithRoles };
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => ({
          id: 'user-new',
          email: data.email,
        })),
      },
      refreshToken: {
        create: jest.fn(async (args: any) => {
          const row = {
            id: `rt-${storedTokens.length + 1}`,
            tokenHash: args.data.tokenHash,
            userId: args.data.userId,
            expiresAt: args.data.expiresAt,
            revokedAt: null,
          };
          storedTokens.push(row);
          return row;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return storedTokens.find((t) => t.tokenHash === where.tokenHash) ?? null;
        }),
        update: jest.fn(async (args: any) => {
          const t = storedTokens.find((s) => s.id === args.where.id)!;
          Object.assign(t, args.data);
          return t;
        }),
        updateMany: jest.fn(async (args: any) => {
          let count = 0;
          for (const t of storedTokens) {
            if (t.tokenHash === args.where.tokenHash && t.revokedAt === null) {
              t.revokedAt = args.data.revokedAt;
              count++;
            }
          }
          return { count };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: Argon2Service,
          useValue: {
            hash: jest.fn(async (plain: string) => `argon2-hash:${plain}`),
            verify: jest.fn(async (hashed: string, plain: string) =>
              Boolean(
                hashed !== '!google-oauth' &&
                  hashed === `argon2-hash:${plain}` &&
                  plain === 'supersecretpass',
              ),
            ),
          },
        },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = module.get(AuthService);
    auditMock.record.mockClear();
    process.env.JWT_ACCESS_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('register', () => {
    it('crea el usuario con hash de contraseña y rol', async () => {
      const result = await service.register({
        email: 'nuevo@noxlux.test',
        password: 'supersecretpass',
        roleCode: 'ADMIN',
      });
      expect(result).toEqual({ id: 'user-new', email: 'nuevo@noxlux.test' });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('rechaza emails duplicados', async () => {
      await expect(
        service.register({
          email: 'admin@noxlux.test',
          password: 'supersecretpass',
          roleCode: 'ADMIN',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login (contraseña)', () => {
    it('devuelve el par de tokens si las credenciales son válidas', async () => {
      const result = await service.login({
        email: 'admin@noxlux.test',
        password: 'supersecretpass',
      });
      expect(result.accessToken).toContain('signed.');
      expect(result.refreshToken).toContain('signed.');
      expect(storedTokens).toHaveLength(1);
    });

    it('rechaza contraseña incorrecta', async () => {
      await expect(
        service.login({ email: 'admin@noxlux.test', password: 'incorrecta' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza usuarios inexistentes', async () => {
      await expect(
        service.login({ email: 'nadie@noxlux.test', password: 'supersecretpass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza cuentas creadas solo para Google', async () => {
      prisma.user.findUnique = jest.fn(async () => ({
        ...userRow,
        passwordHash: '!google-oauth',
      }));
      await expect(
        service.login({ email: 'admin@noxlux.test', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('loginWithGoogle', () => {
    it('emite tokens para un usuario existente', async () => {
      const result = await service.loginWithGoogle('admin@noxlux.test');
      expect(result.accessToken).toContain('signed.');
    });

    it('rechaza emails sin cuenta en la BD', async () => {
      await expect(
        service.loginWithGoogle('foraneo@gmail.com'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rota el refresh token', async () => {
      const pair = await service.login({
        email: 'admin@noxlux.test',
        password: 'supersecretpass',
      });
      const before = storedTokens.length;
      const result = await service.refresh(pair.refreshToken);
      expect(storedTokens).toHaveLength(before + 1);
      expect(result.accessToken).toContain('signed.');
      expect(
        storedTokens.find((t) => t.tokenHash === undefined || t.id === 'rt-1')
          ?.revokedAt,
      ).toBeInstanceOf(Date);
    });

    it('rechaza refresh tokens revocados', async () => {
      const pair = await service.login({
        email: 'admin@noxlux.test',
        password: 'supersecretpass',
      });
      await service.logout(pair.refreshToken);
      await expect(service.refresh(pair.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revoca el refresh token indicado', async () => {
      const pair = await service.login({
        email: 'admin@noxlux.test',
        password: 'supersecretpass',
      });
      await service.logout(pair.refreshToken);
      expect(storedTokens[0].revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('me (perfil + RBAC)', () => {
    it('resuelve id, email, roles y permisos desde la BD', async () => {
      const profile = await service.me({ userId: 'user-1' } as AuthenticatedUser);
      expect(profile.id).toBe('user-1');
      expect(profile.email).toBe('admin@noxlux.test');
      expect(profile.roles).toEqual(['SUPER_ADMIN']);
      expect(profile.permissions).toEqual(['*']);
    });

    it('lanza UnauthorizedException si el usuario ya no existe', async () => {
      await expect(service.me({ userId: 'ghost' } as AuthenticatedUser)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});