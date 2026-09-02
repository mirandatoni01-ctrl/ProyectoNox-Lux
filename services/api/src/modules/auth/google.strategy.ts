import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

/**
 * Google solo autentica la identidad (email). Los roles y permisos
 * siempre provienen de la BD (ADR-NL-018). El usuario debe existir,
 * dado de alta por un admin; Google no crea usuarios.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(
        new UnauthorizedException('Google no devolvió un email válido'),
      );
    }
    try {
      const tokens = await this.authService.loginWithGoogle(email);
      return done(null, { email, tokens } as unknown as Express.User);
    } catch (err) {
      return done(err as Error);
    }
  }
}