import {
  mediaSignatureMatches,
  isAllowedMediaMimeType,
  mediaKeyFromUrl,
  extForMimeType,
  mimeTypeForKey,
  ALLOWED_MEDIA_MIME_TYPES,
} from './media-storage';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.from('VP8L')]);
const gif87 = Buffer.from('GIF87a');
const gif89 = Buffer.from('GIF89a');

describe('media-storage (firmas / NL-12)', () => {
  it('reconoce firmas válidas de jpeg/png/webp/gif', () => {
    expect(mediaSignatureMatches(jpeg, 'image/jpeg')).toBe(true);
    expect(mediaSignatureMatches(png, 'image/png')).toBe(true);
    expect(mediaSignatureMatches(webp, 'image/webp')).toBe(true);
    expect(mediaSignatureMatches(gif87, 'image/gif')).toBe(true);
    expect(mediaSignatureMatches(gif89, 'image/gif')).toBe(true);
  });

  it('rechaza buffers cortos o con firma distinta a la declarada', () => {
    expect(mediaSignatureMatches(Buffer.from('xx'), 'image/jpeg')).toBe(false);
    expect(mediaSignatureMatches(Buffer.from('<html>'), 'image/png')).toBe(false);
    expect(mediaSignatureMatches(Buffer.from('RIFFxxxx'), 'image/webp')).toBe(false);
    expect(mediaSignatureMatches(Buffer.from('GIF66a'), 'image/gif')).toBe(false);
    expect(mediaSignatureMatches(Buffer.alloc(0), 'image/jpeg')).toBe(false);
  });

  it('rechaza mime no permitido / default false', () => {
    expect(isAllowedMediaMimeType('text/plain')).toBe(false);
    expect(isAllowedMediaMimeType('image/svg+xml')).toBe(false);
    expect(mediaSignatureMatches(jpeg, 'image/webp')).toBe(false);
    expect(ALLOWED_MEDIA_MIME_TYPES).not.toContain('image/svg+xml');
  });

  it('mapea extensiones <-> mime y urls <-> key', () => {
    expect(extForMimeType('image/jpeg')).toBe('jpg');
    expect(mimeTypeForKey('x.webp')).toBe('image/webp');
    expect(mimeTypeForKey('x.desconocido')).toBe('application/octet-stream');
    expect(mediaKeyFromUrl('/api/media/file/abc.png')).toBe('abc.png');
    expect(mediaKeyFromUrl('/api/otros/abc.png')).toBeNull();
  });
});
