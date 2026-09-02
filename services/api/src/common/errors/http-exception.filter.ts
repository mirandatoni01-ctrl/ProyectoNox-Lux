import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

const logger = new Logger('HttpExceptionFilter');

/**
 * Filtro global de errores (NL-12).
 * Normaliza TODAS las respuestas de error a `{ statusCode, message, error, path,
 * timestamp }` y garantiza que los internos de NestJS/Prisma (stack traces,
 * mensajes de driver, metadatos de DB) NUNCA se expongan hacia el cliente.
 * El contrato `message` (string o string[]) se preserva para no romper los
 * clientes existentes (apps/store y apps/admin parsean `message`).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.toErrorBody(exception);

    response.status(body.statusCode).json({
      statusCode: body.statusCode,
      message: body.message,
      error: body.error,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...body.extend,
    });
  }

  private toErrorBody(exception: unknown): {
    statusCode: number;
    message: string | string[] | unknown;
    error: string;
    extend: Record<string, unknown>;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { statusCode, message: res, error: res, extend: {} };
      }
      const { statusCode: _sc, message, error, ...extend } = res as Record<string, unknown>;
      return {
        statusCode,
        message: message ?? exception.message,
        error: (error as string) ?? exception.message,
        extend,
      };
    }

    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2002'
    ) {
      logger.warn(`Prisma P2002 (duplicado): ${exception.message}`);
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Conflicto: el registro ya existe',
        error: 'Conflict',
        extend: {},
      };
    }

    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2025'
    ) {
      logger.warn(`Prisma P2025 (no encontrado): ${exception.message}`);
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Recurso no encontrado',
        error: 'Not Found',
        extend: {},
      };
    }

    if (exception instanceof Error) {
      logger.error(exception.message, exception.stack);
    } else {
      logger.error(String(exception));
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
      extend: {},
    };
  }
}