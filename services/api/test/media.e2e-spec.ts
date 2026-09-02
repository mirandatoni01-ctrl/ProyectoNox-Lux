import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import {
  type MediaStorage,
  MEDIA_STORAGE,
  extForMimeType,
  mediaUrlForKey,
} from '../src/modules/media/storage/media-storage';

process.env.JWT_ACCESS_SECRET = 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
process.env.JWT_ACCESS_TTL = '900';
process.env.JWT_REFRESH_TTL = '604800';

const adminUser = {
  id: 'e2e-user-1',
  email: 'admin@noxlux.test',
  passwordHash: 'mock-argon2:supersecretpass',
  fullName: 'Admin',
  isActive: true,
  roles: [
    {
      role: {
        code: 'SUPER_ADMIN',
        permissions: [{ permission: { code: '*' } }],
      },
    },
  ],
};

const storedTokens: any[] = [];

const files = new Map<string, { buffer: Buffer; mimeType: string }>();
let referencedUrl = '';

// Fixtures con magic bytes reales (NL-12): el servidor verifica signatura.
const webpValid = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBP'),
  Buffer.from('data'),
]);
const pngValid = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('img-bytes'),
]);
const htmlAsPng = Buffer.from('<html><body>hola</body></html>');

const memoryStorage: MediaStorage = {
  async save(buffer, mimeType) {
    const key = `mem-${files.size + 1}.${extForMimeType(mimeType)}`;
    files.set(key, { buffer: Buffer.from(buffer), mimeType });
    return { key, url: mediaUrlForKey(key), mimeType, size: buffer.length };
  },
  async read(key) {
    return files.get(key) ?? null;
  },
  async deleteObject(key) {
    files.delete(key);
  },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id === 'e2e-user-1' || where.email === 'admin@noxlux.test') {
        return { ...adminUser };
      }
      return null;
    }),
    create: jest.fn(async ({ data }: any) => ({ id: 'e2e-user-new', email: data.email })),
  },
  refreshToken: {
    create: jest.fn(async (args: any) => {
      const row = {
        id: `e2e-rt-${storedTokens.length + 1}`,
        tokenHash: args.data.tokenHash,
        userId: args.data.userId,
        expiresAt: args.data.expiresAt,
        revokedAt: null,
      };
      storedTokens.push(row);
      return row;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      return storedTokens.find((t) => t.tokenHash === where.tokenHash) ?? null;
    }),
    update: jest.fn(async (args: any) => {
      const t = storedTokens.find((s) => s.id === args.where.id);
      if (t) Object.assign(t, args.data);
      return t;
    }),
    updateMany: jest.fn(async (args: any) => {
      let count = 0;
      for (const t of storedTokens) {
        if (t.tokenHash === args.where.tokenHash && t.revokedAt === null) {
          t.revokedAt = args.data.revokedAt;
          count++;
        }
      }
      return { count };
    }),
  },
  auditLog: {
    create: jest.fn(async ({ data }: any) => ({ id: 'audit-new', ...data })),
  },
  productImage: {
    findFirst: jest.fn(async ({ where }: any) => {
      return where.url === referencedUrl ? { id: 'img-inuse', url: referencedUrl } : null;
    }),
    findMany: jest.fn(async () => [
      {
        id: 'img-1',
        url: '/api/media/file/mem-1.webp',
        alt: 'ANILLO',
        position: 0,
        isPrimary: true,
        product: { id: 'p-1', name: 'ANILLO HELIOS LUX', isActive: true },
      },
    ]),
  },
};

describe('Media (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(MEDIA_STORAGE)
      .useValue(memoryStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@noxlux.test', password: 'supersecretpass' })
      .expect(200);
    return res.body.accessToken as string;
  };

  it('POST /api/media/upload → 401 sin token', async () => {
    await request(app.getHttpServer()).post('/api/media/upload').expect(401);
  });

  it('POST /api/media/upload → 201 sube un webp, audita y sirve la url', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', webpValid, {
        filename: 'foto.webp',
        contentType: 'image/webp',
      })
      .expect(201);
    expect(res.body.key).toMatch(/^mem-\d+\.webp$/);
    expect(res.body.mimeType).toBe('image/webp');
    expect(res.body.size).toBe(webpValid.length);
    expect(res.body.url).toContain('/api/media/file/');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'media.upload', entity: 'media' }),
    });
  });

  it('POST /api/media/upload → 400 si el mime no es imagen', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello'), {
        filename: 'nota.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('POST /api/media/upload → 400 si el contenido no coincide con el mime (magic bytes)', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', htmlAsPng, {
        filename: 'codigo.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('POST /api/media/upload → 400 sin archivo', async () => {
    const token = await login();
    await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /api/media/file/:key → 200 con content-type correcto', async () => {
    const token = await login();
    const uploaded = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngValid, {
        filename: 'foto.png',
        contentType: 'image/png',
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get(uploaded.body.url)
      .expect(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /api/media/file/:key → 404 si la key no existe', async () => {
    const token = await login();
    void token;
    await request(app.getHttpServer()).get('/api/media/file/no-existe.png').expect(404);
  });

  it('GET /api/media → 200 con la galería (media:ver) y 401 sin token', async () => {
    const token = await login();
    const res = await request(app.getHttpServer())
      .get('/api/media')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].productName).toBe('ANILLO HELIOS LUX');
    await request(app.getHttpServer()).get('/api/media').expect(401);
  });

  it('DELETE /api/media/:key → 409 si la imagen está en uso', async () => {
    const token = await login();
    const uploaded = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', webpValid, {
        filename: 'use.webp',
        contentType: 'image/webp',
      })
      .expect(201);
    referencedUrl = uploaded.body.url;
    await request(app.getHttpServer())
      .delete(`/api/media/${uploaded.body.key}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('DELETE /api/media/:key → 200 borra un blob libre y luego 404', async () => {
    const token = await login();
    const uploaded = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', webpValid, {
        filename: 'free.webp',
        contentType: 'image/webp',
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .delete(`/api/media/${uploaded.body.key}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({ key: uploaded.body.key, deleted: true });
    await request(app.getHttpServer()).get(uploaded.body.url).expect(404);
  });

  it('DELETE /api/media/:key → 401 sin token', async () => {
    await request(app.getHttpServer()).delete('/api/media/mem-1.webp').expect(401);
  });
});