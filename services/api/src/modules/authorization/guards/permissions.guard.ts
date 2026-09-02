import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Requiere que el usuario autenticado tenga todos los permisos indicados.
 * El código '*' (SUPER_ADMIN) concede cualquier permiso.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !Array.isArray(user.permissions)) {
      return false;
    }
    const granted = user.permissions as string[];
    if (granted.includes('*')) {
      return true;
    }
    return required.every((permission) => granted.includes(permission));
  }
}
