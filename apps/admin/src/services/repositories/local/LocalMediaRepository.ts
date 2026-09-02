import type { MediaRepository } from '../types';
import type { ProductImage } from '../../../types';

/**
 * Repositorio de Media local (NL-09): en modo dev (sin API) convierte el
 * archivo a object URL para previsualizarlo. No persiste nada; la persistencia
 * real llega con el backend de media en el modo integración (VITE_AUTH_MODE=api).
 */
export class LocalMediaRepository implements MediaRepository {
  private kept: ProductImage[] = [];

  async upload(file: File): Promise<ProductImage> {
    const image: ProductImage = {
      id: `local-${crypto.randomUUID()}`,
      url: URL.createObjectURL(file),
      isPrimary: false,
    };
    this.kept.push(image);
    return image;
  }

  async list(): Promise<ProductImage[]> {
    return this.kept;
  }

  async remove(mediaId: string): Promise<void> {
    this.kept = this.kept.filter((m) => m.id !== mediaId);
  }
}