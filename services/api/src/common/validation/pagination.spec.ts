import { z } from 'zod';
import { limitField, MAX_LIST_LIMIT, DEFAULT_LIST_LIMIT } from './pagination';

describe('pagination.limitField (NL-12)', () => {
  it('usa el default si no se provee', () => {
    const r = z.object({ limit: limitField }).safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(DEFAULT_LIST_LIMIT);
  });

  it('acepta un límite dentro del rango', () => {
    const r = z.object({ limit: limitField }).safeParse({ limit: 25 });
    expect(r.success).toBe(true);
  });

  it('rechaza un límite que excede el máximo', () => {
    const r = z.object({ limit: limitField }).safeParse({ limit: MAX_LIST_LIMIT + 1 });
    expect(r.success).toBe(false);
  });

  it('rechaza un límite menor a 1', () => {
    const r = z.object({ limit: limitField }).safeParse({ limit: 0 });
    expect(r.success).toBe(false);
  });

  it('rechaza un límite no numérico', () => {
    const r = z.object({ limit: limitField }).safeParse({ limit: 'abc' });
    expect(r.success).toBe(false);
  });
});
