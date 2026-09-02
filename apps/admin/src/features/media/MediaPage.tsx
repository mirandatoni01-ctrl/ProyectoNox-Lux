import { useEffect, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import type { ProductImage } from '../../types';
import { absoluteMediaUrl } from '../../services/api/client';
import { getMediaRepository } from '../../services/repositories';

/**
 * Página Media (NL-09, F-17): biblioteca real de imágenes subidas al backend
 * (vista + subida + borrado con confirmación). Sustituye al placeholder PRONTO.
 */
export function MediaPage() {
  const mediaRepo = getMediaRepository();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await mediaRepo.list();
        if (cancelled) return;
        setImages(result);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar las imágenes');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await mediaRepo.upload(file);
      setImages((prev) => [uploaded, ...prev]);
      showToast('IMAGEN SUBIDA');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemove = async (image: ProductImage) => {
    if (!window.confirm('¿Eliminar esta imagen del almacén?')) return;
    try {
      await mediaRepo.remove(image.id);
      setImages((prev) => prev.filter((img) => img.id !== image.id));
      showToast('IMAGEN ELIMINADA');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la imagen');
    }
  };

  return (
    <div>
      {toast && (
        <div className="animate-fade-in fixed right-4 top-4 z-50 bg-black px-6 py-3 text-xs font-bold tracking-widest text-white uppercase">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-widest uppercase">Media</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {images.length} imágenes · almacén {import.meta.env.VITE_AUTH_MODE === 'api' ? 'NOX &amp; LUX API' : 'local'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById('media-file-input')?.click()}
          className="flex items-center gap-2 bg-black px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase hover:bg-neutral-800"
        >
          <ImagePlus size={14} /> Subir
        </button>
        <input
          id="media-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {isLoading && <p className="mt-8 text-sm text-neutral-500">Cargando imágenes…</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

      {!isLoading && !error && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.id}
              className="group relative overflow-hidden rounded border border-neutral-200 bg-white"
            >
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={absoluteMediaUrl(image.url)}
                  alt={image.alt ?? 'media NOX & LUX'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-[10px] tracking-widest text-neutral-500 uppercase">
                  {image.id}
                </p>
                <button
                  type="button"
                  onClick={() => void handleRemove(image)}
                  aria-label={`Eliminar ${image.id}`}
                  className="rounded-full border border-neutral-200 p-1.5 text-neutral-400 hover:border-red-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
          {images.length === 0 && (
            <li className="col-span-full py-16 text-center text-sm text-neutral-500">
              NO HAY IMÁGENES AÚN. SUBE LA PRIMERA.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}