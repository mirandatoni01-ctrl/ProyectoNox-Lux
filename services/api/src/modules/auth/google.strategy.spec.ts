import { UnauthorizedException } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from './auth.service';

process.env.GOOGLE_CLIENT_ID = 'google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';

const mockDone = jest.fn();
const profileWithEmail = () =>
  ({ emails: [{ value: 'user@google.com' }] }) as any;
const profileNoEmail = () => ({ emails: [] }) as any;

describe('GoogleStrategy (unit / NL-12)', () => {
  const authService = { loginWithGoogle: jest.fn() };

  const build = () => new GoogleStrategy(authService as unknown as AuthService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve error si Google no manda email', async () => {
    const strategy = build();
    strategy.validate('at', 'rt', profileNoEmail(), mockDone);
    expect(mockDone).toHaveBeenCalledWith(
      expect.any(UnauthorizedException),
    );
    expect(authService.loginWithGoogle).not.toHaveBeenCalled();
  });

  it('devuelve (null, {email, tokens}) al autenticar con Google', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r' };
    authService.loginWithGoogle.mockResolvedValue(tokens);
    const strategy = build();
    strategy.validate('at', 'rt', profileWithEmail(), mockDone);
    await Promise.resolve();
    expect(authService.loginWithGoogle).toHaveBeenCalledWith('user@google.com');
    expect(mockDone).toHaveBeenCalledWith(null, {
      email: 'user@google.com',
      tokens,
    });
  });

  it('propaga hacia done los errores de loginWithGoogle', async () => {
    authService.loginWithGoogle.mockRejectedValue(new Error('no autorizado'));
    const strategy = build();
    await strategy.validate('at', 'rt', profileWithEmail(), mockDone);
    expect(mockDone).toHaveBeenCalledWith(expect.any(Error));
  });
});
