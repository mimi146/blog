import { describe, expect, it } from 'vitest';
import { convertZone } from '../../src/lib/tools/timezone';

describe('convertZone', () => {
  it('converts India Standard Time to UTC', () => {
    const result = convertZone('2026-11-03T16:00', 'Asia/Kolkata', 'UTC');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.instant.toISOString()).toBe('2026-11-03T10:30:00.000Z');
  });

  it('uses standard time and daylight time for New York', () => {
    const winter = convertZone('2026-01-15T12:00', 'America/New_York', 'UTC');
    const summer = convertZone('2026-07-15T12:00', 'America/New_York', 'UTC');
    expect(winter.ok && winter.value.instant.toISOString()).toBe('2026-01-15T17:00:00.000Z');
    expect(summer.ok && summer.value.instant.toISOString()).toBe('2026-07-15T16:00:00.000Z');
  });

  it('rejects a spring-forward gap and a bad zone name', () => {
    expect(convertZone('2026-03-08T02:30', 'America/New_York', 'UTC').ok).toBe(false);
    expect(convertZone('2026-01-15T12:00', 'Not/AZone', 'UTC').ok).toBe(false);
  });
});
