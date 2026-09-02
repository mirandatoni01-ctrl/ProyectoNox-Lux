import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';

function mockContext(user?: { roles?: string[]; permissions?: string[] }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (unit)', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('permite cuando no hay metadatos de roles', () => {
    expect(guard.canActivate(mockContext(undefined))).toBe(true);
  });

  it('permite al usuario con el rol requerido', () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    expect(guard.canActivate(mockContext({ roles: ['SUPER_ADMIN'] }))).toBe(true);
  });

  it('deniega cuando el rol no coincide', () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    expect(guard.canActivate(mockContext({ roles: ['ADMIN'] }))).toBe(false);
  });

  it('deniega cuando no hay usuario', () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(guard.canActivate(mockContext(undefined))).toBe(false);
  });
});

describe('PermissionsGuard (unit)', () => {
  let guard: PermissionsGuard;

  beforeEach(() => {
    guard = new PermissionsGuard(new Reflector());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('permite cuando no hay metadatos de permisos', () => {
    expect(guard.canActivate(mockContext(undefined))).toBe(true);
  });

  it('permite cuando el usuario tiene todos los permisos', () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['products.create']);
    expect(
      guard.canActivate(mockContext({ permissions: ['products.create', 'products.read'] })),
    ).toBe(true);
  });

  it('deniega cuando falta algún permiso', () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['products.create', 'inventory.write']);
    expect(
      guard.canActivate(mockContext({ permissions: ['products.create'] })),
    ).toBe(false);
  });

  it('deniega cuando no hay usuario', () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['products.create']);
    expect(guard.canActivate(mockContext(undefined))).toBe(false);
  });
});