import { describe, expect, it } from 'vitest';
import { assertWithinPixelBudget, fitWithin, isHeic, MAX_PIXELS } from '../../src/lib/tools/image';

describe('image helpers', () => {
  it('fits the long edge and leaves smaller images alone', () => {
    expect(fitWithin(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 });
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10, 10, null)).toEqual({ width: 10, height: 10 });
  });

  it('recognizes HEIC by type or extension', () => {
    expect(isHeic({ name: 'photo.HEIC', type: '' })).toBe(true);
    expect(isHeic({ name: 'photo.jpg', type: 'image/heif' })).toBe(true);
    expect(isHeic({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false);
  });

  it('rejects bitmaps over the pixel budget', () => {
    expect(() => assertWithinPixelBudget(10_000, 10_000)).toThrow(/too large/);
    expect(10_000 * 10_000).toBeGreaterThan(MAX_PIXELS);
    expect(() => assertWithinPixelBudget(2000, 2000)).not.toThrow();
  });
});
