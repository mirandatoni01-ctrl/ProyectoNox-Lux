import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleCode } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { Argon2Service } from '../../common/crypto/argon2.service';
import { AuthenticatedUser } from '../authorization/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

/** Placeholder de hash para usuarios dados de alta por Google (nunca verificado). */
const GOOGLE_PLACEHOLDER_PREFIX = '!google-oauth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly argon2: Argon2Service,
    private readonly jwt: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private get accessTtl(): number {
    return Number(process.env.JWT_ACCESS_TTL ?? 900);
  }

  private get refreshTtl(): number {
    return Number(process.env.JWT_REFRESH_TTL ?? 604800);
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async issueTokenPair(
    user: { id: string; email: string },
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: this.accessTtl,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: this.refreshTtl,
    });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  /** Alta de usuarios: SOLO admins (guard del controller). El admin define la contraseña. */
  async register(input: {
    email: string;
    password: string;
    fullName?: string;
    roleCode: RoleCode;
    actorUserId?: string;
  }): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new BadRequestException('El email ya está registrado');
    }
    const passwordHash = await this.argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        roles: {
          create: { role: { connect: { code: input.roleCode } } },
        },
      },
    });
    await this.auditService.record({
      action: 'auth.register',
      entity: 'user',
      entityId: user.id,
      actorUserId: input.actorUserId,
      metadata: { email: user.email, roleCode: input.roleCode },
    });
    return { id: user.id, email: user.email };
  }

  /** Autoregistro de comprador (Store, rol CUSTOMER). Público. */
  async registerCustomer(input: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new BadRequestException('El email ya está registrado');
    }
    const passwordHash = await this.argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        roles: {
          create: { role: { connect: { code: RoleCode.CUSTOMER } } },
        },
      },
    });
    await this.auditService.record({
      action: 'auth.register',
      entity: 'user',
      entityId: user.id,
      metadata: { email: user.email, roleCode: 'CUSTOMER' },
    });
    return this.issueTokenPair(user);
  }

  /** Actualización del propio perfil (nombre/teléfono). */
  async updateProfile(
    userId: string,
    input: { fullName?: string; phone?: string },
  ): Promise<{ id: string; fullName: string | null; phone: string | null }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
      select: { id: true, fullName: true, phone: true },
    });
    await this.auditService.record({
      action: 'auth.profile.update',
      entity: 'user',
      entityId: userId,
    });
    return user;
  }

  /** Cambio de contraseña del propio usuario (requiere la actual). */
  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario inválido');
    }
    if (user.passwordHash.startsWith(GOOGLE_PLACEHOLDER_PREFIX)) {
      throw new BadRequestException(
        'Esta cuenta no tiene contraseña (usa Google); vincula un email para crear una',
      );
    }
    const ok = await this.argon2.verify(user.passwordHash, input.currentPassword);
    if (!ok) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    const passwordHash = await this.argon2.hash(input.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, provider: 'password' },
    });
    await this.auditService.record({
      action: 'auth.password.change',
      entity: 'user',
      entityId: userId,
    });
  }

  /** Vincula Google a una cuenta existente (email+contraseña). */
  async linkGoogle(userId: string, googleEmail: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario inválido');
    }
    const existing = await this.prisma.user.findUnique({
      where: { email: googleEmail },
    });
    if (existing && existing.id !== userId) {
      throw new BadRequestException(
        'Ya existe una cuenta registrada con ese email de Google',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { provider: 'google' },
    });
    await this.auditService.record({
      action: 'auth.google.link',
      entity: 'user',
      entityId: userId,
      metadata: { googleEmail },
    });
  }

  /** Desvincula Google: la cuenta pasa a gestionarse por contraseña. */
  async unlinkGoogle(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario inválido');
    }
    if (user.passwordHash.startsWith(GOOGLE_PLACEHOLDER_PREFIX)) {
      throw new BadRequestException(
        'No se puede desvincular Google sin una contraseña; añade una contraseña primero',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { provider: null },
    });
    await this.auditService.record({
      action: 'auth.google.unlink',
      entity: 'user',
      entityId: userId,
    });
  }

  /** Login con contraseña. */
  async login(input: { email: string; password: string }): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !user.isActive) {
      await this.auditService.record({
        action: 'auth.login.failed',
        entity: 'auth',
        entityId: 'anonymous',
        metadata: { reason: 'user_not_found', email: input.email },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (user.passwordHash.startsWith(GOOGLE_PLACEHOLDER_PREFIX)) {
      await this.auditService.record({
        action: 'auth.login.failed',
        entity: 'auth',
        entityId: user.id,
        metadata: { reason: 'google_only_account' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await this.argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      await this.auditService.record({
        action: 'auth.login.failed',
        entity: 'auth',
        entityId: user.id,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    await this.auditService.record({
      action: 'auth.login',
      entity: 'user',
      entityId: user.id,
    });
    return this.issueTokenPair(user);
  }

  /** Google solo autentica la identidad (email); roles siempre de la BD.
   *  NL-13: si el email no existe, se crea un usuario CUSTOMER de forma
   *  transparente (autoregistro por Google del comprador). Los admins se dan
   *  de alta manualmente (con contraseña) y nunca se auto-crean aquí. */
  async loginWithGoogle(email: string): Promise<TokenPair> {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      try {
        user = await this.prisma.user.create({
          data: {
            email,
            passwordHash: `${GOOGLE_PLACEHOLDER_PREFIX}-${randomUUID()}`,
            provider: 'google',
            roles: {
              create: { role: { connect: { code: RoleCode.CUSTOMER } } },
            },
          },
        });
        await this.auditService.record({
          action: 'auth.register.google',
          entity: 'user',
          entityId: user.id,
          metadata: { email, roleCode: 'CUSTOMER', provider: 'google' },
        });
      } catch {
        // Si la creación falla (p. ej. carrera), se continua al login normal.
        user = await this.prisma.user.findUnique({ where: { email } });
      }
    }
    if (!user || !user.isActive) {
      await this.auditService.record({
        action: 'auth.login.failed',
        entity: 'auth',
        entityId: 'anonymous',
        metadata: { reason: 'google_no_account', email },
      });
      throw new UnauthorizedException(
        'No se pudo completar el inicio de sesión con Google',
      );
    }
    await this.auditService.record({
      action: 'auth.login',
      entity: 'user',
      entityId: user.id,
      metadata: { provider: 'google' },
    });
    return this.issueTokenPair(user);
  }

  /** Renovación de sesión con rotación del refresh token. */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawRefreshToken) },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (stored.expiresAt.getTime() < Date.now() || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token revocado o expirado');
    }
    if (stored.revokedAt !== null) {
      // Reuso de un token ya rotado = indicio de robo: revoca TODA la familia
      // de refresh tokens activos del usuario (detección de replay, NL-12).
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sesión revocada: se detectó el reuso de un token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inválido o inactivo');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    await this.auditService.record({
      action: 'auth.refresh',
      entity: 'user',
      entityId: payload.sub,
    });
    return this.issueTokenPair(user);
  }

  /** Cierre de sesión: revoca el refresh token emitido. */
  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawRefreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Logout no requiere JWT → el actor es desconocido.
    await this.auditService.record({
      action: 'auth.logout',
      entity: 'auth',
      entityId: 'anonymous',
    });
  }

  /** Perfil del usuario autenticado (roles y permisos resueltos desde la BD). */
  async me(user: AuthenticatedUser): Promise<{
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    provider: string | null;
    roles: string[];
    permissions: string[];
  }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!dbUser) {
      throw new UnauthorizedException();
    }
    const roles = dbUser.roles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        dbUser.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code)),
      ),
    ];
    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.fullName,
      phone: dbUser.phone,
      provider: dbUser.provider,
      roles,
      permissions,
    };
  }
}