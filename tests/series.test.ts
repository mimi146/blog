import { describe, it, expect } from 'vitest';
import { SERIES, getSeriesDef, orderSeries } from '../src/lib/series';

const post = (id: string, series?: string, seriesPart?: number) => ({ id, data: { series, seriesPart } });

describe('orderSeries', () => {
  it('returns only the requested series, ordered by part', () => {
    const posts = [post('c', 's', 3), post('x'), post('a', 's', 1), post('o', 'other', 1), post('b', 's', 2)];
    expect(orderSeries(posts, 's').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list for an unknown series', () => {
    expect(orderSeries([post('a', 's', 1)], 'nope')).toEqual([]);
  });

  it('throws on a duplicate part number', () => {
    expect(() => orderSeries([post('a', 's', 1), post('b', 's', 1)], 's')).toThrow(/expected part 2/);
  });

  it('throws on a gap in the numbering', () => {
    expect(() => orderSeries([post('a', 's', 1), post('c', 's', 3)], 's')).toThrow(/expected part 2/);
  });
});

describe('SERIES', () => {
  it('has unique ids and can be looked up', () => {
    const ids = SERIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getSeriesDef(ids[0])?.id).toBe(ids[0]);
    expect(getSeriesDef('nope')).toBeUndefined();
  });
});
