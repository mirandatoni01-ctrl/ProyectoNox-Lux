import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalMediaStorageProvider } from './local-media-storage.provider';

describe('LocalMediaStorageProvider (unit)', () => {
  let dir: string;
  let provider: LocalMediaStorageProvider;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'noxlux-media-'));
    provider = new LocalMediaStorageProvider({ root: dir });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('save: escribe el blob con key uuid+ext y devuelve url pública', async () => {
    const stored = await provider.save(Buffer.from('webp-bytes'), 'image/webp');
    expect(stored.key).toMatch(/^[0-9a-f-]{36}\.webp$/);
    expect(stored.url).toBe(`/api/media/file/${stored.key}`);
    expect(stored.mimeType).toBe('image/webp');
    expect(stored.size).toBe(10);
    const files = await readdir(join(dir, 'media'));
    expect(files).toEqual([stored.key]);
  });

  it('read: roundtrip del buffer y mime por extensión (jpeg → content-type)', async () => {
    const stored = await provider.save(Buffer.from('jpeg-bytes'), 'image/jpeg');
    const file = await provider.read(stored.key);
    expect(file?.buffer.toString()).toBe('jpeg-bytes');
    expect(file?.mimeType).toBe('image/jpeg');
  });

  it('read: null si el key no existe', async () => {
    expect(await provider.read('ghost.png')).toBeNull();
  });

  it('deleteObject: borra el archivo', async () => {
    const stored = await provider.save(Buffer.from('x'), 'image/gif');
    await provider.deleteObject(stored.key);
    await expect(readFile(join(dir, 'media', stored.key))).rejects.toThrow();
    expect(await provider.read(stored.key)).toBeNull();
  });

  it('soporta png y gif además de jpeg/webp', async () => {
    for (const mime of ['image/png', 'image/gif'] as const) {
      const stored = await provider.save(Buffer.from('x'), mime);
      expect(stored.url.endsWith(mime === 'image/png' ? '.png' : '.gif')).toBe(true);
      expect((await provider.read(stored.key))?.mimeType).toBe(mime);
    }
  });

  it('ignora rutas jerárquicas en la key (solo usa basename)', async () => {
    await provider.save(Buffer.from('x'), 'image/webp');
    await provider.deleteObject('../no-existe');
    expect(await provider.read('../no-existe')).toBeNull();
  });
});