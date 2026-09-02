import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (unit)', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
  });

  it('register pasa dto + actor', async () => {
    authService.register.mockResolvedValue({ id: 'u-1', email: 'a@x.com' });
    await controller.register(
      { email: 'a@x.com', password: 'x', roleCode: 'ADMIN' } as any,
      { userId: 'super' } as any,
    );
    expect(authService.register).toHaveBeenCalledWith({
      email: 'a@x.com',
      password: 'x',
      roleCode: 'ADMIN',
      actorUserId: 'super',
    });
  });

  it('login delega', async () => {
    authService.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
    await controller.login({ email: 'a@x.com', password: 'x' } as any);
    expect(authService.login).toHaveBeenCalled();
  });

  it('refresh delega', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
    await controller.refresh({ refreshToken: 'rt' } as any);
    expect(authService.refresh).toHaveBeenCalledWith('rt');
  });

  it('logout delega', async () => {
    await controller.logout({ refreshToken: 'rt' } as any);
    expect(authService.logout).toHaveBeenCalledWith('rt');
  });

  it('me delega', async () => {
    authService.me.mockResolvedValue({ id: 'u-1', email: 'a', roles: [], permissions: [] });
    const res = await controller.me({ userId: 'u-1' } as any);
    expect(res.id).toBe('u-1');
  });

  it('googleLogin no hace nada (passport redirige)', () => {
    expect(controller.googleLogin()).toBeUndefined();
  });

  it('googleCallback devuelve tokens JSON', async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await controller.googleCallback(
      { email: 'a@x.com', tokens: { accessToken: 'a', refreshToken: 'r' } } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' });
  });
});
