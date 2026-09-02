import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MediaService } from './media.service';
import {
  type StoredFile,
  MEDIA_STORAGE,
} from './storage/media-storage';

describe('MediaService (unit)', () => {
  let service: MediaService;
  let storageMock: {
    save: jest.Mock;
    read: jest.Mock;
    deleteObject: jest.Mock;
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    productImage: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined), list: jest.fn() };

  // Buffers con magic bytes reales (NL-12: el contenido debe coincidir con el mime).
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const webp = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.alloc(4),
    Buffer.from('WEBP'),
    Buffer.from('VP8'),
  ]);

  const stored: StoredFile = {
    key: 'abc.webp',
    url: '/api/media/file/abc.webp',
    mimeType: 'image/webp',
    size: 3,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.UPLOAD_MAX_MB;
    storageMock = {
      save: jest.fn(async () => stored),
      read: jest.fn(async () => ({ buffer: Buffer.from('img'), mimeType: 'image/webp' })),
      deleteObject: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: MEDIA_STORAGE, useValue: storageMock },
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(MediaService);
  });

  describe('upload', () => {
    it('guarda, devuelve el archivo y audita con actor', async () => {
      const result = await service.upload(webp, 'foto.webp', 'image/webp', 'user-1');
      expect(storageMock.save).toHaveBeenCalledWith(expect.any(Buffer), 'image/webp');
      expect(result).toEqual(stored);
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'user-1',
          action: 'media.upload',
          entity: 'media',
          entityId: 'abc.webp',
        }),
      );
    });

    it('rechaza un mime no permitido (400)', async () => {
      await expect(
        service.upload(Buffer.from('x'), 'malo.txt', 'text/plain', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storageMock.save).not.toHaveBeenCalled();
    });

    it('rechaza un archivo vacío (400)', async () => {
      await expect(
        service.upload(Buffer.alloc(0), 'vacio.png', 'image/png', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un archivo que supera UPLOAD_MAX_MB (400)', async () => {
      process.env.UPLOAD_MAX_MB = '1';
      await expect(
        service.upload(Buffer.alloc(2 * 1024 * 1024), 'pesado.png', 'image/png', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no audita si no hay actor', async () => {
      await service.upload(png, 'foto.png', 'image/png');
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it('rechaza un archivo cuyo contenido no coincide con el mime (magic bytes)', async () => {
      // Políglota/adjunto: HTML disfrazado de PNG.
      await expect(
        service.upload(Buffer.from('<html><script>alert(1)</script></html>'), 'codigo.png', 'image/png'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storageMock.save).not.toHaveBeenCalled();
    });
  });

  describe('getFile', () => {
    it('devuelve buffer + mime', async () => {
      const file = await service.getFile('abc.webp');
      expect(file.mimeType).toBe('image/webp');
      expect(file.buffer.toString()).toBe('img');
    });

    it('404 si el archivo no existe', async () => {
      storageMock.read.mockResolvedValue(null);
      await expect(service.getFile('ghost.png')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteAsset', () => {
    it('rechaza con 409 si la imagen está en uso', async () => {
      prisma.productImage.findFirst.mockResolvedValue({ id: 'img-1', url: '/api/media/file/abc.webp' });
      await expect(service.deleteAsset('abc.webp', 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(storageMock.deleteObject).not.toHaveBeenCalled();
    });

    it('borra el blob y audita si no está referenciada', async () => {
      prisma.productImage.findFirst.mockResolvedValue(null);
      const result = await service.deleteAsset('abc.webp', 'user-1');
      expect(storageMock.deleteObject).toHaveBeenCalledWith('abc.webp');
      expect(result).toEqual({ key: 'abc.webp', deleted: true });
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'media.delete', entityId: 'abc.webp' }),
      );
    });
  });

  describe('removeByUrl', () => {
    it('borra cuando la url es media local y devuelve true', async () => {
      const removed = await service.removeByUrl('/api/media/file/abc.webp', 'user-1');
      expect(removed).toBe(true);
      expect(storageMock.deleteObject).toHaveBeenCalledWith('abc.webp');
    });

    it('no toca storage cuando la url es externa y devuelve false', async () => {
      const removed = await service.removeByUrl('https://img/remoto.jpg');
      expect(removed).toBe(false);
      expect(storageMock.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('mapea las imágenes con su producto', async () => {
      prisma.productImage.findMany.mockResolvedValue([
        {
          id: 'img-1',
          url: '/api/media/file/abc.webp',
          alt: 'ANILLO',
          position: 0,
          isPrimary: true,
          product: { id: 'p-1', name: 'ANILLO HELIOS LUX', isActive: true },
        },
      ]);
      const list = await service.list();
      expect(prisma.productImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
      expect(list[0]).toMatchObject({
        id: 'img-1',
        url: '/api/media/file/abc.webp',
        productId: 'p-1',
        productName: 'ANILLO HELIOS LUX',
        isPrimary: true,
      });
    });
  });
});