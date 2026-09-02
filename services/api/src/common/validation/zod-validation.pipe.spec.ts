import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(1), role: z.string() }).strict();

  it('devuelve el dato validado', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ name: 'A', role: 'ADMIN' }, {} as any)).toEqual({
      name: 'A',
      role: 'ADMIN',
    });
  });

  it('lanza 400 con issues estructurados cuando la validación falla', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ name: '' }, {} as any);
      throw new Error('no lanzó');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const res = (err as BadRequestException).getResponse() as any;
      const issues = res.message as Array<{ path: string; code: string }>;
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].path).toBeDefined();
      expect(issues[0].code).toBeDefined();
    }
  });

  it('rechaza campos extra (strict) con 400', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ name: 'A', role: 'ADMIN', isAdmin: true }, {} as any);
      throw new Error('no lanzó');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
    }
  });
});
