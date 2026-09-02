import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard opcional de JWT (profundidad NL-13): autentica al usuario si el
 * request trae un Bearer token válido, pero NO rechaza requests anónimos.
 * Útil para el checkout del Store: un comprador logueado asocia su pedido
 * (order.userId), y un visitante anónimo sigue pudiendo comprar.
 * Si la autenticación falla o no hay token, `request.user` queda null.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info: unknown,
    _context: unknown,
    _status?: unknown,
  ): TUser | null {
    // No propagamos errores de autenticación: el endpoint es accesible anónima.
    if (err || !user) {
      return null;
    }
    return user;
  }
}