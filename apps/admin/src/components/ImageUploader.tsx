import { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import type { ProductImage } from '../types';
import { absoluteMediaUrl } from '../services/api/client';
import { getMediaRepository } from '../services/repositories';

interface Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  /** Separación de una imagen persistida/:quitar blob del backend (best-effort). */
  onRemoveImage?: (image: ProductImage) => void;
}

/**
 * Galería de imágenes de producto (NL-09): sube vía MediaRepository (API o
 * local), permite elegir la primaria y quitar imágenes. Reemplaza al simulador
 * de muestras Unsplash.
 */
export function ImageUploader({ images, onChange, onRemoveImage }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await getMediaRepository().upload(file);
      onChange([...images, uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const setPrimary = (id: string) => {
    onChange(images.map((img) => ({ ...img, isPrimary: img.id === id })));
  };

  const remove = (image: ProductImage) => {
    onChange(images.filter((img) => img.id !== image.id));
    onRemoveImage?.(image);
  };

  return (
    <div>
      <span className="text-xs tracking-wider text-neutral-500">IMÁGENES (JPEG/PNG/WEBP/GIF)</span>
      <div className="mt-2 flex flex-wrap gap-3">
        {images.map((image) => (
          <div key={image.id} className="group relative">
            <button
              type="button"
              onClick={() => setPrimary(image.id)}
              title={image.isPrimary ? 'Imagen principal' : 'Marcar como principal'}
              className={`relative h-20 w-20 overflow-hidden rounded border-2 ${
                image.isPrimary ? 'border-black' : 'border-neutral-200'
              }`}
            >
              <img
                src={absoluteMediaUrl(image.url)}
                alt={image.alt ?? 'imagen del producto'}
                className="h-full w-full object-cover"
              />
              {image.isPrimary && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Star size={16} className="text-white" />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => remove(image)}
              aria-label="Quitar imagen"
              className="absolute -top-2 -right-2 rounded-full border border-neutral-200 bg-white p-1.5 text-neutral-500 shadow hover:border-red-400 hover:text-red-600"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 items-center justify-center rounded border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-black hover:text-black disabled:opacity-50"
          aria-label="Subir imagen"
        >
          {uploading ? '…' : <ImagePlus size={20} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFiles}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}