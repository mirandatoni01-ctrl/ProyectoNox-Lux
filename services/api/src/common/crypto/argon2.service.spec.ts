import { Argon2Service } from './argon2.service';

// @node-rs/argon2 (binario nativo) se mapea a un stub vía moduleNameMapper
// (ver jest.config.js). El binario real se valida en el arranque del servidor.
describe('Argon2Service', () => {
  let service: Argon2Service;

  beforeEach(() => {
    service = new Argon2Service();
  });

  it('hash + verify (roundtrip) a través del wrapper', async () => {
    const hashed = await service.hash('secret');
    expect(hashed).toContain('mock-argon2:');
    await expect(service.verify(hashed, 'secret')).resolves.toBe(true);
  });

  it('verify rechaza contraseña incorrecta', async () => {
    const hashed = await service.hash('secret');
    await expect(service.verify(hashed, 'incorrecta')).resolves.toBe(false);
  });
});
