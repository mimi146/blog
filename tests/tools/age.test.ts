import { describe, expect, it } from 'vitest';
import { ageBetween } from '../../src/lib/tools/age';

describe('ageBetween', () => {
  it('returns a whole number of years on the anniversary', () => {
    const age = ageBetween('2000-01-15', '2020-01-15');
    expect(age.ok && age.value).toMatchObject({ years: 20, months: 0, days: 0, totalDays: 7305, weekday: 'Saturday' });
  });

  it('borrows a month when the day has not been reached', () => {
    const age = ageBetween('2000-01-15', '2020-01-14');
    expect(age.ok && age.value).toMatchObject({ years: 19, months: 11, days: 30 });
  });

  it('clamps a 31st to the end of a short month', () => {
    const age = ageBetween('2000-01-31', '2000-03-01');
    expect(age.ok && age.value).toMatchObject({ years: 0, months: 1, days: 1 });
  });

  it('treats 29 February as 28 February in a non-leap year', () => {
    const age = ageBetween('2000-02-29', '2001-02-28');
    expect(age.ok && age.value).toMatchObject({ years: 1, months: 0, days: 0, birthdayToday: true, daysUntilBirthday: 0 });
  });

  it('rejects an as-of date before birth and an impossible day', () => {
    expect(ageBetween('2020-01-02', '2020-01-01').ok).toBe(false);
    expect(ageBetween('2020-02-31', '2020-03-01').ok).toBe(false);
  });
});
