import { Module } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Autorización/RBAC. Decide qué puede hacer cada rol (ADR-NL-001, NL-05).
 * Guards: RolesGuard (`@Roles(...)`) y PermissionsGuard (`@Permissions(...)`),
 * que leen `request.user` poblado por JwtStrategy (auth).
 */
@Module({
  providers: [RolesGuard, PermissionsGuard],
  exports: [RolesGuard, PermissionsGuard],
})
export class AuthorizationModule {}