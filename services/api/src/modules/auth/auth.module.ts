import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';

/**
 * Autenticación (NL-05, ADR-NL-018). Modelo dual:
 *  - Login con contraseña (Argon2id) para usuarios creados por admin.
 *  - Google OAuth solo autentica identidad (email); roles siempre de la BD.
 * Tokens: access JWT corto + refresh token con rotación y revocación en BD.
 * GoogleStrategy solo se registra si GOOGLE_CLIENT_ID está configurado
 * (passport-oauth2 requiere clientID; sin credenciales no debe romper el boot).
 */
const googleCredentialsConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

@Module({
  imports: [
    CryptoModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    AuditModule,
  ],
  controllers: [AuthController],
  providers:
    googleCredentialsConfigured
      ? [AuthService, JwtStrategy, GoogleStrategy]
      : [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}