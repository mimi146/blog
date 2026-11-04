import { compareYmd, daysBetween, daysInMonth, formatISODate, formatLongDate, parseISODate, weekdayName, type Ymd } from './calendar';
import { err, ok, type Result } from './result';

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  weeks: number;
  extraDays: number;
  weekday: string;
  nextBirthday: string;
  nextBirthdayLabel: string;
  daysUntilBirthday: number;
  birthdayToday: boolean;
}

/** Move a birth date forward by whole years and months, clamping the day to the target month. */
export function addYearsAndMonths(birth: Ymd, years: number, months: number): Ymd {
  const monthIndex = birth.month - 1 + months;
  const year = birth.year + years + Math.floor(monthIndex / 12);
  const month = (((monthIndex % 12) + 12) % 12) + 1;
  return { year, month, day: Math.min(birth.day, daysInMonth(year, month)) };
}

/**
 * Calendar age from birth to asOf.
 * A 29 February birthday lands on 28 February in a non-leap year.
 */
export function ageBetween(birthISO: string, asOfISO: string): Result<AgeResult> {
  const birth = parseISODate(birthISO);
  const asOf = parseISODate(asOfISO);
  if (!birth) return err('Enter a real date of birth.');
  if (!asOf) return err('Enter a real as-of date.');
  if (compareYmd(asOf, birth) < 0) return err('The as-of date is before the date of birth.');

  let years = asOf.year - birth.year;
  if (compareYmd(addYearsAndMonths(birth, years, 0), asOf) > 0) years -= 1;

  let months = 0;
  while (months < 12 && compareYmd(addYearsAndMonths(birth, years, months + 1), asOf) <= 0) months += 1;

  const anchor = addYearsAndMonths(birth, years, months);
  const days = daysBetween(anchor, asOf);
  const totalDays = daysBetween(birth, asOf);

  let next = addYearsAndMonths(birth, asOf.year - birth.year, 0);
  if (compareYmd(next, asOf) < 0) next = addYearsAndMonths(birth, asOf.year - birth.year + 1, 0);
  const daysUntilBirthday = daysBetween(asOf, next);

  return ok({
    years,
    months,
    days,
    totalDays,
    weeks: Math.floor(totalDays / 7),
    extraDays: totalDays % 7,
    weekday: weekdayName(birth),
    nextBirthday: formatISODate(next),
    nextBirthdayLabel: formatLongDate(next),
    daysUntilBirthday,
    birthdayToday: daysUntilBirthday === 0,
  });
}
