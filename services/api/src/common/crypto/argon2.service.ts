import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * Hashing de contraseñas con Argon2id (SECURITY_MODEL.md).
 * Implementación: @node-rs/argon2 (binarios precompilados, sin compilación nativa).
 */
@Injectable()
export class Argon2Service {
  async hash(plain: string): Promise<string> {
    return hash(plain);
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    return verify(hashed, plain);
  }
}
