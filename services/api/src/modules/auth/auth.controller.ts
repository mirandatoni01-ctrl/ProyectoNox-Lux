import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoleCode } from '@prisma/client';
import { Response } from 'express';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../authorization/decorators/current-user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { AuthService } from './auth.service';
import {
  changePasswordSchema,
  ChangePasswordDto,
  loginSchema,
  LoginDto,
  refreshSchema,
  RefreshDto,
  registerCustomerSchema,
  RegisterCustomerDto,
  registerSchema,
  RegisterDto,
  updateProfileSchema,
  UpdateProfileDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Alta de usuarios: solo SUPER_ADMIN + `usuarios:gestionar` (ADR-NL-018). */
  @Post('register')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  @Permissions('usuarios:gestionar')
  register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; email: string }> {
    return this.authService.register({ ...dto, actorUserId: user.userId });
  }

  /** Autoregistro de comprador (Store): crea un usuario rol CUSTOMER y devuelve sesión. Público. */
  @Post('register/customer')
  @HttpCode(HttpStatus.CREATED)
  registerCustomer(
    @Body(new ZodValidationPipe(registerCustomerSchema)) dto: RegisterCustomerDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.registerCustomer(dto);
  }

  /** Actualización del propio perfil (nombre/teléfono). */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; fullName: string | null; phone: string | null }> {
    return this.authService.updateProfile(user.userId, dto);
  }

  /** Cambio de contraseña del propio usuario autenticado. */
  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.authService.changePassword(user.userId, dto);
  }

  /** Vincula Google a la propia cuenta (email+contraseña). */
  @Post('me/google/link')
  @UseGuards(JwtAuthGuard)
  async linkGoogle(
    @Body() body: { googleEmail?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const email = body.googleEmail?.toLowerCase().trim();
    if (!email) {
      throw new BadRequestException('googleEmail es obligatorio');
    }
    await this.authService.linkGoogle(user.userId, email);
  }

  /** Desvincula Google de la propia cuenta (requiere una contraseña). */
  @Post('me/google/unlink')
  @UseGuards(JwtAuthGuard)
  async unlinkGoogle(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.unlinkGoogle(user.userId);
  }

  /** Login con contraseña (Argon2id). */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.login(dto);
  }

  /** Inicio del flujo OAuth de Google (requiere credenciales configuradas en .env). */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // passport redirige al consentimiento de Google
  }

  /** Callback de Google: devuelve los tokens de sesión. */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @CurrentUser() cb: { email: string; tokens: { accessToken: string; refreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    res.status(HttpStatus.OK).json(cb.tokens);
  }

  /** Renovación de sesión con rotación de refresh token. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  /** Cierre de sesión: revoca el refresh token. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto,
  ): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  /** Perfil del usuario autenticado. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    provider: string | null;
    roles: string[];
    permissions: string[];
  }> {
    return this.authService.me(user);
  }
}