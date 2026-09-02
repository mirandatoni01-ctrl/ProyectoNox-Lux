import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MEDIA_STORAGE } from './storage/media-storage';

describe('MediaController (unit)', () => {
  let controller: MediaController;
  const mediaService = {
    list: jest.fn(),
    upload: jest.fn(),
    getFile: jest.fn(),
    deleteAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: mediaService },
        { provide: MEDIA_STORAGE, useValue: {} },
      ],
    }).compile();
    controller = module.get(MediaController);
  });

  it('list pasa limit', async () => {
    await controller.list({ limit: 15 } as any);
    expect(mediaService.list).toHaveBeenCalledWith(15);
  });

  it('upload lanza 400 sin archivo', () => {
    expect(() => controller.upload(undefined, { userId: 'u-1' } as any)).toThrow(
      BadRequestException,
    );
  });

  it('upload delega con archivo + actor', async () => {
    const file = { buffer: Buffer.from('x'), originalname: 'a.png', mimetype: 'image/png' } as any;
    await controller.upload(file, { userId: 'u-1' } as any);
    expect(mediaService.upload).toHaveBeenCalledWith(
      file.buffer,
      'a.png',
      'image/png',
      'u-1',
    );
  });

  it('file setea headers y envía el buffer', async () => {
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;
    mediaService.getFile.mockResolvedValue({ buffer: Buffer.from('img'), mimeType: 'image/png' });
    await controller.file('a.png', res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('img'));
  });

  it('remove delega con actor', async () => {
    await controller.remove('a.png', { userId: 'u-1' } as any);
    expect(mediaService.deleteAsset).toHaveBeenCalledWith('a.png', 'u-1');
  });
});
