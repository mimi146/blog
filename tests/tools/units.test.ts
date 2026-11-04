import { describe, expect, it } from 'vitest';
import { convertUnit, transferSeconds, unitById, DATA_UNITS, THROUGHPUT_UNITS } from '../../src/lib/tools/units';

function unit(list: typeof DATA_UNITS, id: string) {
  const found = unitById(list, id);
  if (!found) throw new Error(id);
  return found;
}

describe('convertUnit', () => {
  it('treats MB as decimal and MiB as binary', () => {
    const mebi = convertUnit(1, unit(DATA_UNITS, 'MiB'), unit(DATA_UNITS, 'MB'));
    const kilo = convertUnit(1, unit(DATA_UNITS, 'KiB'), unit(DATA_UNITS, 'kB'));
    expect(mebi.ok && mebi.value).toBeCloseTo(1.048576, 6);
    expect(kilo.ok && kilo.value).toBeCloseTo(1.024, 6);
    expect(convertUnit(8, unit(DATA_UNITS, 'bit'), unit(DATA_UNITS, 'B'))).toEqual({ ok: true, value: 1 });
  });

  it('converts megabits per second into bytes per second', () => {
    const bytes = convertUnit(8, unit(THROUGHPUT_UNITS, 'Mbps'), unit(THROUGHPUT_UNITS, 'MBps'));
    expect(bytes.ok && bytes.value).toBeCloseTo(1, 6);
  });

  it('estimates transfer time from bytes and bits per second', () => {
    expect(transferSeconds(1_000_000, 8_000_000)).toEqual({ ok: true, value: 1 });
    expect(transferSeconds(10, 0).ok).toBe(false);
  });
});
