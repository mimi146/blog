import { describe, expect, it } from 'vitest';
import { explainCron } from '../../src/lib/tools/cron';

const from = new Date('2020-01-01T00:00:00Z');

function explained(expression: string, start = from, zone = 'UTC') {
  const result = explainCron(expression, start, 5, zone);
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('explainCron', () => {
  it('describes common five-field expressions', () => {
    expect(explained('* * * * *').summary).toBe('Every minute');
    expect(explained('0 * * * *').summary).toBe('At minute 0 of every hour');
    expect(explained('0 0 * * *').summary).toBe('At 00:00 every day');
    expect(explained('30 9 * * 1-5').summary).toBe('At 09:30, Monday through Friday');
    expect(explained('0 0 1 * *').summary).toBe('At 00:00 on day 1 of the month');
    expect(explained('0 0 1 1 *').summary).toBe('At 00:00 on day 1 of the month, in January');
    expect(explained('*/15 * * * *').summary).toBe('Every 15 minutes');
    expect(explained('0 0 * * MON').summary).toBe('At 00:00 on Monday');
    expect(explained('15,45 9 * * *').summary).toBe('At 09:15 and 09:45 every day');
  });

  it('expands aliases and reads a leading seconds field', () => {
    const hourly = explained('@hourly');
    expect(hourly.alias).toBe('@hourly');
    expect(hourly.summary).toBe('At minute 0 of every hour');
    expect(explained('0 30 9 * * *').summary).toBe('At 09:30:00 every day');
    expect(explained('*/15 * * * *').fields[0]?.values).toEqual([0, 15, 30, 45]);
  });

  it('lists the next runs in UTC', () => {
    expect(explained('* * * * *').next.map((run) => run.iso)).toEqual([
      '2020-01-01T00:01:00.000Z',
      '2020-01-01T00:02:00.000Z',
      '2020-01-01T00:03:00.000Z',
      '2020-01-01T00:04:00.000Z',
      '2020-01-01T00:05:00.000Z',
    ]);
    expect(explained('0 0 * * *').next[0]?.iso).toBe('2020-01-02T00:00:00.000Z');
    expect(explained('30 9 * * 1-5').next[0]?.iso).toBe('2020-01-01T09:30:00.000Z');
    expect(explained('0 12 1 1 *').next[0]?.iso).toBe('2020-01-01T12:00:00.000Z');
  });

  it('treats Quartz ? as unrestricted and rejects unsupported letters', () => {
    expect(explained('0 0 ? * MON').summary).toBe('At 00:00 on Monday');
    expect(explainCron('0 0 L * *').ok).toBe(false);
    expect(explainCron('60 * * * *').ok).toBe(false);
    expect(explainCron('* * *').ok).toBe(false);
  });

  it('keeps weekday names and Sunday as 0 or 7', () => {
    expect(explained('0 0 * * 7').fields.find((field) => field.name === 'Day of week')?.values).toEqual([0]);
    expect(explained('0 0 * * FRI-SUN').summary).toBe('At 00:00, Friday through Sunday');
  });
});
