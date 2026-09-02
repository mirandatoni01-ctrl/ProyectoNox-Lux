import { authedRequest } from '../../api/client';
import type { MediaRepository } from '../types';
import type { ProductImage } from '../../../types';

/**
 * Repositorio de Media sobre la NOX & LUX API (NL-09).
 * Endpoints: POST /api/media/upload (multipart), GET /api/media,
 * DELETE /api/media/:key. El blob se sirve de forma pública en
 * `/api/media/file/<key>` (imageUrl/product.images lo referencian).
 */
export class ApiMediaRepository implements MediaRepository {
  async upload(file: File): Promise<ProductImage> {
    const form = new FormData();
    form.append('file', file);
    const result = await authedRequest<{
      key: string;
      url: string;
      mimeType: string;
      size: number;
    }>('/api/media/upload', { method: 'POST', body: form });
    if (!result.ok) throw result.error;
    return { id: result.data.key, url: result.data.url, isPrimary: false };
  }

  async list(): Promise<ProductImage[]> {
    const result = await authedRequest<
      {
        id: string;
        url: string;
        alt: string | null;
        isPrimary: boolean;
        productId: string | null;
        productName: string | null;
      }[]
    >('/api/media');
    if (!result.ok) throw result.error;
    return result.data.map((m) => ({
      id: m.id,
      url: m.url,
      alt: m.alt ?? undefined,
      isPrimary: m.isPrimary,
    }));
  }

  async remove(mediaId: string): Promise<void> {
    const result = await authedRequest<{ key: string; deleted: boolean }>(
      `/api/media/${mediaId}`,
      { method: 'DELETE' },
    );
    if (!result.ok) throw result.error;
  }
}