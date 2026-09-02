import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { paginationSchema, type PaginationQuery } from '../../common/validation/pagination';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../authorization/decorators/current-user.decorator';
import { CurrentUser } from '../authorization/decorators/current-user.decorator';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { MediaService } from './media.service';

const UPLOAD_MAX_MB = Number(process.env.UPLOAD_MAX_MB) || 5;

/**
 * Media (NL-09). Subida multipart protegida con `media:subir`; la lectura del
 * blob (`file/:key`) es pública (imágenes del catálogo). Los permisos se añaden
 * al seed (media:ver/subir/eliminar).
 */
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /** Galería del Admin (F-17): imágenes del catálogo con su producto. */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('media:ver')
  list(@Query(new ZodValidationPipe(paginationSchema)) query?: PaginationQuery) {
    return this.mediaService.list(query?.limit);
  }

  /** Subida de una imagen (multipart, campo `file`). Límite por UPLOAD_MAX_MB. */
  @Post('upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('media:subir')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: UPLOAD_MAX_MB * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido (campo "file")');
    return this.mediaService.upload(file.buffer, file.originalname, file.mimetype, user.userId);
  }

  /** Sirve el blob (público) con Content-Type por extensión + nosniff. */
  @Get('file/:key')
  async file(@Param('key') key: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.mediaService.getFile(key);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  }

  /** Borra un blob no referenciado (409 si está en uso por un producto). */
  @Delete(':key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('media:eliminar')
  remove(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.deleteAsset(key, user.userId);
  }
}