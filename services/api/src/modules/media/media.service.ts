import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DEFAULT_LIST_LIMIT } from '../../common/validation/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  type AllowedMediaMimeType,
  type MediaStorage,
  type StoredFile,
  MEDIA_STORAGE,
  isAllowedMediaMimeType,
  mediaKeyFromUrl,
  mediaSignatureMatches,
  mediaUrlForKey,
} from './storage/media-storage';

const DEFAULT_MAX_MB = 5;

/**
 * Media (NL-09). Subida de imágenes reales a un storage abstracto (driver local
 * por defecto) y registro en `AuditLog` (`media.upload`/`media.delete`).
 * `ProductImage` sigue siendo la tabla de referencia por producto; aquí se
 * gestiona el blob únicamente.
 */
@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private get maxBytes(): number {
    const mb = Number(process.env.UPLOAD_MAX_MB) || DEFAULT_MAX_MB;
    return mb * 1024 * 1024;
  }

  /** Sube un archivo validado (mime whitelist + tamaño) y deja traza de auditoría. */
  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    actorUserId?: string,
  ): Promise<StoredFile> {
    this.assertValid(buffer, mimeType);
    const stored = await this.storage.save(buffer, mimeType as AllowedMediaMimeType);
    if (actorUserId) {
      await this.auditService.record({
        action: 'media.upload',
        entity: 'media',
        entityId: stored.key,
        actorUserId,
        metadata: {
          url: stored.url,
          mimeType: stored.mimeType,
          size: stored.size,
          originalName: originalName ?? null,
        },
      });
    }
    return stored;
  }

  /** Listado de imágenes del catálogo para la página Media del Admin (F-17). */
  async list(limit: number = DEFAULT_LIST_LIMIT) {
    const rows = await this.prisma.productImage.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true, isActive: true } } },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      alt: row.alt,
      position: row.position,
      isPrimary: row.isPrimary,
      productId: row.product.id,
      productName: row.product.name,
      isActive: row.product.isActive,
    }));
  }

  /** Lee un blob para servirlo (GET /api/media/file/:key, público). */
  async getFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const file = await this.storage.read(key);
    if (!file) throw new NotFoundException('Archivo no encontrado');
    return file;
  }

  /** DELETE /api/media/:key — rechaza si la imagen está referenciada (409). */
  async deleteAsset(key: string, actorUserId?: string) {
    const url = mediaUrlForKey(key);
    const inUse = await this.prisma.productImage.findFirst({ where: { url } });
    if (inUse) {
      throw new ConflictException('La imagen está en uso por un producto');
    }
    await this.removeObject(key, actorUserId);
    return { key, deleted: true };
  }

  /** Borra el blob de una url local (usado al eliminar/reemplazar imágenes de producto). */
  async removeByUrl(url: string, actorUserId?: string): Promise<boolean> {
    const key = mediaKeyFromUrl(url);
    if (!key) return false;
    await this.removeObject(key, actorUserId);
    return true;
  }

  /** Borra el blob sin comprobar referencias (el llamador gestiona el desacople). */
  async removeObject(key: string, actorUserId?: string): Promise<void> {
    await this.storage.deleteObject(key);
    if (actorUserId) {
      await this.auditService.record({
        action: 'media.delete',
        entity: 'media',
        entityId: key,
        actorUserId,
        metadata: {},
      });
    }
  }

  private assertValid(buffer: Buffer, mimeType: string): void {
    if (!isAllowedMediaMimeType(mimeType)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${mimeType}`);
    }
    if (buffer.length === 0) {
      throw new BadRequestException('El archivo está vacío');
    }
    if (buffer.length > this.maxBytes) {
      throw new BadRequestException(
        `El archivo supera el límite de ${this.maxBytes / 1024 / 1024} MB`,
      );
    }
    // El mimeType declarado debe coincidir con el contenido real (NL-12).
    if (!mediaSignatureMatches(buffer, mimeType)) {
      throw new BadRequestException('El archivo no es una imagen válida');
    }
  }
}