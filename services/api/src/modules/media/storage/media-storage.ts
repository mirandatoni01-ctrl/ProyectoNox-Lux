/**
 * NOX & LUX — Port de almacenamiento de media (NL-09).
 * La UI/negocio dependen de esta interfaz (ADR-NL-002) y el driver concreto se
 * resuelve por inyección. NL-09 usa LocalMediaStorageProvider (disco local
 * servido por el API); el driver S3-compatible (Object Storage) está definido en
 * el contrato (SYSTEM_BOUNDARIES / SECURITY_MODEL: URLs firmadas) y se activará
 * en NL-13/14 según ADR-NL-INFRA-001.
 */

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

/** Token de inyección del driver de almacenamiento. */
export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');

/** Resultado de un guardado: clave única en el storage + URL pública. */
export interface StoredFile {
  key: string;
  url: string;
  mimeType: AllowedMediaMimeType;
  size: number;
}

/**
 * Contrato de almacenamiento de blobs.
 * `read`/`deleteObject` usan la `key` devuelta por `save`.
 */
export interface MediaStorage {
  save(buffer: Buffer, mimeType: AllowedMediaMimeType): Promise<StoredFile>;
  read(key: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  deleteObject(key: string): Promise<void>;
}

/** Base de las URLs de archivo servidas por el API. */
export const MEDIA_BASE_PATH = '/api/media/file';

const MIME_TO_EXT: Record<AllowedMediaMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function isAllowedMediaMimeType(mimeType: string): mimeType is AllowedMediaMimeType {
  return (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Verificación de magic bytes (NL-12): el contenido del archivo debe coincidir
 * con el mimeType declarado por el cliente. Bloquea políglotas y adjuntos que
 * suplantan extensiones (p. ej. un HTML disfrazado de .png).
 */
export function mediaSignatureMatches(buffer: Buffer, mimeType: AllowedMediaMimeType): boolean {
  switch (mimeType) {
    case 'image/jpeg':
      return (
        buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      );
    case 'image/png': {
      const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      return buffer.length >= 8 && magic.every((byte, i) => buffer[i] === byte);
    }
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
        buffer.subarray(8, 12).toString('latin1') === 'WEBP'
      );
    case 'image/gif':
      return (
        buffer.length >= 6 &&
        (buffer.subarray(0, 6).toString('latin1') === 'GIF87a' ||
          buffer.subarray(0, 6).toString('latin1') === 'GIF89a')
      );
    default:
      return false;
  }
}

export function extForMimeType(mimeType: AllowedMediaMimeType): string {
  return MIME_TO_EXT[mimeType];
}

export function mimeTypeForKey(key: string): string {
  const ext = (key.split('.').pop() ?? '').toLowerCase();
  return EXT_TO_MIME[ext] ?? 'application/octet-stream';
}

export function mediaUrlForKey(key: string): string {
  return `${MEDIA_BASE_PATH}/${encodeURIComponent(key)}`;
}

/** Extrae la key de una url del API; null si la url no es media local. */
export function mediaKeyFromUrl(url: string): string | null {
  const prefix = `${MEDIA_BASE_PATH}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length));
}