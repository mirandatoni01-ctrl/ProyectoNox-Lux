import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter (NL-12)', () => {
  let filter: HttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let request: { url: string };

  const run = async (exception: unknown) => {
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    request = { url: '/api/test' };
    filter = new HttpExceptionFilter();
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as any;
    await filter.catch(exception, host);
  };

  it('normaliza una HttpException (string message)', async () => {
    await run(new NotFoundException('No encontrado'));
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'No encontrado',
        path: '/api/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('normaliza una HttpException con objeto de respuesta (mass-assignment 400)', async () => {
    await run(new BadRequestException(['campo extra no permitido']));
    expect(response.status).toHaveBeenCalledWith(400);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toEqual(['campo extra no permitido']);
    expect(body.extended).toBeUndefined();
  });

  it('mapea P2002 (duplicado) → 409 sin detalles de Prisma', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('dup key', {
      code: 'P2002',
      clientVersion: '7',
    });
    await run(err);
    expect(response.status).toHaveBeenCalledWith(409);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('Conflicto: el registro ya existe');
    expect(JSON.stringify(body)).not.toContain('dup key');
  });

  it('mapea P2025 (no encontrado) → 404', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('missing', {
      code: 'P2025',
      clientVersion: '7',
    });
    await run(err);
    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('errores desconocidos → 500 "Error interno" sin mensaje interno', async () => {
    await run(new Error('stack secreto de la BD'));
    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0];
    expect(body.message).toBe('Error interno del servidor');
    expect(JSON.stringify(body)).not.toContain('stack secreto');
  });

  it('valores no-Error → 500 genérico', async () => {
    await run('string error');
    expect(response.status).toHaveBeenCalledWith(500);
  });
});
