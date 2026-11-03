import { describe, expect, it } from 'vitest';
import { parseNumberList, percentile } from '../../src/lib/tools/percentile';

const sample = [1, 2, 3, 4, 5];

describe('percentile', () => {
  it('matches inclusive interpolation, including the endpoints', () => {
    expect(percentile(sample, 0, 'inclusive').ok && percentile(sample, 0, 'inclusive')).toMatchObject({ ok: true, value: { value: 1 } });
    expect(percentile(sample, 25, 'inclusive')).toMatchObject({ ok: true, value: { value: 2 } });
    expect(percentile(sample, 50, 'inclusive')).toMatchObject({ ok: true, value: { value: 3 } });
    expect(percentile(sample, 100, 'inclusive')).toMatchObject({ ok: true, value: { value: 5 } });
  });

  it('matches exclusive interpolation and refuses ranks outside the sample', () => {
    const exclusive = percentile(sample, 20, 'exclusive');
    expect(exclusive.ok && exclusive.value.value).toBeCloseTo(1.2, 10);
    expect(percentile(sample, 50, 'exclusive')).toMatchObject({ ok: true, value: { value: 3 } });
    expect(percentile(sample, 10, 'exclusive').ok).toBe(false);
    expect(percentile(sample, 0, 'exclusive').ok).toBe(false);
  });

  it('uses nearest rank and keeps the minimum at zero', () => {
    expect(percentile(sample, 0, 'nearest')).toMatchObject({ ok: true, value: { value: 1 } });
    expect(percentile(sample, 25, 'nearest')).toMatchObject({ ok: true, value: { value: 2 } });
    expect(percentile(sample, 100, 'nearest')).toMatchObject({ ok: true, value: { value: 5 } });
  });

  it('parses mixed separators and rejects a stray word', () => {
    expect(parseNumberList('1, 2\n3;4')).toEqual({ ok: true, value: [1, 2, 3, 4] });
    expect(parseNumberList('1, a').ok).toBe(false);
    expect(percentile([], 50, 'inclusive').ok).toBe(false);
  });
});
