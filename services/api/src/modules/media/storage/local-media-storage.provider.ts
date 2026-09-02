import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  type AllowedMediaMimeType,
  type MediaStorage,
  type StoredFile,
  extForMimeType,
  mediaUrlForKey,
  mimeTypeForKey,
} from './media-storage';

export interface LocalMediaStorageOptions {
  /** Directorio raíz de media (por defecto env MEDIA_ROOT o `uploads`). */
  root?: string;
}

/**
 * Driver de disco local servido por el API (NL-09). Las URLs son rutas del
 * propio backend (`/api/media/file/<key>`) → no requieren CORS/credenciales en
 * el cliente. `basename()` evita path traversal. Reemplazable por S3 en NL-13/14.
 */
export class LocalMediaStorageProvider implements MediaStorage {
  private readonly root: string;

  constructor(options: LocalMediaStorageOptions = {}) {
    this.root = options.root ?? process.env.MEDIA_ROOT ?? 'uploads';
  }

  private resolve(key: string): string {
    return join(this.root, 'media', basename(key));
  }

  async save(buffer: Buffer, mimeType: AllowedMediaMimeType): Promise<StoredFile> {
    const key = `${randomUUID()}.${extForMimeType(mimeType)}`;
    const filePath = this.resolve(key);
    await mkdir(join(this.root, 'media'), { recursive: true });
    await writeFile(filePath, buffer, { flag: 'wx' });
    return { key, url: mediaUrlForKey(key), mimeType, size: buffer.length };
  }

  async read(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const buffer = await readFile(this.resolve(key));
      return { buffer, mimeType: mimeTypeForKey(key) };
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}