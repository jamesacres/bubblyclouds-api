import { DatePipe } from './datePipe';

describe('DatePipe', () => {
  const pipe = new DatePipe();

  it('converts a string expiresAt into a Date', async () => {
    const iso = '2030-01-01T00:00:00.000Z';
    const result = await pipe.transform({ expiresAt: iso, other: 1 });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect((result.expiresAt as Date).toISOString()).toBe(iso);
    expect(result.other).toBe(1);
  });

  it('leaves objects without a string expiresAt untouched', async () => {
    const date = new Date();
    const input = { expiresAt: date };
    const result = await pipe.transform(input);
    expect(result.expiresAt).toBe(date);
  });

  it('leaves objects with no expiresAt untouched', async () => {
    const result = await pipe.transform({ foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
  });

  it('passes through non-object values', async () => {
    expect(await pipe.transform('hello')).toBe('hello');
    expect(await pipe.transform(42)).toBe(42);
    expect(await pipe.transform(undefined)).toBe(undefined);
  });
});
