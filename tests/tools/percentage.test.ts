import { describe, expect, it } from 'vitest';
import { percentChange, percentOf, whatPercent } from '../../src/lib/tools/percentage';

describe('percentage', () => {
  it('computes a part, a ratio, and a change', () => {
    expect(percentOf(8, 250)).toEqual({ ok: true, value: 20 });
    expect(whatPercent(20, 250)).toEqual({ ok: true, value: 8 });
    expect(percentChange(80, 100)).toEqual({ ok: true, value: 25 });
    expect(percentChange(100, 80)).toEqual({ ok: true, value: -20 });
  });

  it('rejects a zero whole or a zero starting value', () => {
    expect(whatPercent(1, 0).ok).toBe(false);
    expect(percentChange(0, 5).ok).toBe(false);
  });
});
