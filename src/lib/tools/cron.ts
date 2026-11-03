import { err, ok, type Result } from './result';
import { addSeconds, civilToInstant, formatZoned, instantToCivil, isValidTimeZone, type CivilTime } from './timezone';

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const DOW_NAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ALIASES: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

interface FieldSpec {
  name: string;
  min: number;
  max: number;
  names?: Record<string, number>;
  dow?: boolean;
}

export interface CronField {
  name: string;
  raw: string;
  values: number[];
  unrestricted: boolean;
  text: string;
}

export interface CronExplanation {
  expression: string;
  alias: string | null;
  summary: string;
  fields: CronField[];
  hasSeconds: boolean;
  next: { iso: string; label: string }[];
}

const MINUTE: FieldSpec = { name: 'Minute', min: 0, max: 59 };
const HOUR: FieldSpec = { name: 'Hour', min: 0, max: 23 };
const DOM: FieldSpec = { name: 'Day of month', min: 1, max: 31 };
const MONTH: FieldSpec = { name: 'Month', min: 1, max: 12, names: MONTH_NAMES };
const DOW: FieldSpec = { name: 'Day of week', min: 0, max: 7, names: DOW_NAMES, dow: true };
const SECOND: FieldSpec = { name: 'Second', min: 0, max: 59 };
const YEAR: FieldSpec = { name: 'Year', min: 1970, max: 2199 };

function listText(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function numericRanges(values: number[]): { start: number; end: number }[] {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const ranges: { start: number; end: number }[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const value = sorted[i];
    if (value === prev + 1) {
      prev = value;
      continue;
    }
    ranges.push({ start, end: prev });
    start = value;
    prev = value;
  }
  ranges.push({ start, end: prev });
  return ranges;
}

function tokenValue(token: string, spec: FieldSpec): number {
  const lower = token.toLowerCase();
  if (spec.names && lower in spec.names) return spec.names[lower];
  if (!/^\d+$/.test(token)) throw new Error(`${spec.name} has an invalid value "${token}".`);
  const value = Number(token);
  const max = spec.dow ? 7 : spec.max;
  if (value < spec.min || value > max) throw new Error(`${spec.name} must be from ${spec.min} to ${max}.`);
  return value;
}

function expandRange(start: number, end: number, step: number, spec: FieldSpec): number[] {
  if (start > end) throw new Error(`${spec.name} has a reversed range.`);
  const values: number[] = [];
  for (let value = start; value <= end; value += step) {
    values.push(spec.dow && value === 7 ? 0 : value);
  }
  return values;
}

function expandPart(part: string, spec: FieldSpec): number[] {
  if (!part) throw new Error(`${spec.name} has an empty list item.`);
  if (/[#]|[LW]/i.test(part) && !/^[a-z]{3}$/i.test(part)) {
    throw new Error(`${spec.name} uses "${part}". This explainer reads stars, lists, ranges, steps, names, and ?.`);
  }
  const stepMatch = /^(.+)\/(\d+)$/.exec(part);
  const step = stepMatch ? Number(stepMatch[2]) : 1;
  const base = stepMatch ? stepMatch[1] : part;
  if (step < 1) throw new Error(`${spec.name} has an invalid step.`);
  if (spec.dow) return expandDow(base, step);
  if (base === '*') return expandRange(spec.min, spec.max, step, spec);
  if (base.includes('-')) {
    const pieces = base.split('-');
    if (pieces.length !== 2 || !pieces[0] || !pieces[1]) throw new Error(`${spec.name} has an invalid range.`);
    return expandRange(tokenValue(pieces[0], spec), tokenValue(pieces[1], spec), step, spec);
  }
  const start = tokenValue(base, spec);
  if (stepMatch) return expandRange(start, spec.max, step, spec);
  return [start];
}

function dowEndpoint(token: string, asEnd: boolean, start?: number): number {
  const lower = token.toLowerCase();
  if (lower in DOW_NAMES) {
    const value = DOW_NAMES[lower];
    if (asEnd && value === 0 && (start ?? 0) > 0) return 7;
    return value;
  }
  return tokenValue(token, DOW);
}

function expandDow(base: string, step: number): number[] {
  let start: number;
  let end: number;
  if (base === '*') {
    start = 0;
    end = 6;
  } else if (base.includes('-')) {
    const pieces = base.split('-');
    if (pieces.length !== 2 || !pieces[0] || !pieces[1]) throw new Error('Day of week has an invalid range.');
    start = dowEndpoint(pieces[0], false);
    end = dowEndpoint(pieces[1], true, start);
  } else {
    start = dowEndpoint(base, false);
    end = step === 1 ? start : 7;
  }
  return expandRange(start, end, step, DOW);
}

function parseField(raw: string, spec: FieldSpec): CronField {
  const text = raw.trim();
  if (!text) throw new Error(`${spec.name} is empty.`);
  if (text === '*' || text === '?') {
    const values = spec.dow ? expandRange(0, 6, 1, spec) : expandRange(spec.min, spec.max, 1, spec);
    return {
      name: spec.name,
      raw: text,
      values,
      unrestricted: true,
      text: text === '?' ? 'Any value (Quartz ?).' : `Every ${spec.name.toLowerCase()}.`,
    };
  }
  const values = [...new Set(text.split(',').flatMap((part) => expandPart(part.trim().toLowerCase(), spec)))].sort((a, b) => a - b);
  if (values.length === 0) throw new Error(`${spec.name} has no values.`);
  return { name: spec.name, raw: text, values, unrestricted: false, text: describeField(spec, text, values) };
}

function describeField(spec: FieldSpec, raw: string, values: number[]): string {
  const step = /^\*\/(\d+)$/.exec(raw);
  if (step) return `Every ${step[1]} ${spec.name.toLowerCase()}${step[1] === '1' ? '' : 's'}.`.replace('every 1 ', 'every ');
  if (spec.dow) {
    const names = weekdayLabels(values);
    if (names.length === 0) return 'Every day of the week.';
    return names.length === 1 && names[0].includes(' through ') ? `${names[0]}.` : `On ${listText(names)}.`;
  }
  if (spec.name === 'Month') {
    const names = numericRanges(values).map((range) =>
      range.start === range.end ? MONTHS[range.start - 1] : `${MONTHS[range.start - 1]} through ${MONTHS[range.end - 1]}`,
    );
    return `In ${listText(names)}.`;
  }
  if (values.length === 1) return `${spec.name} ${values[0]}.`;
  const ranges = numericRanges(values).map((range) => (range.start === range.end ? String(range.start) : `${range.start}–${range.end}`));
  return `${spec.name}s ${listText(ranges)}.`;
}

function isAny(field: CronField): boolean {
  return field.unrestricted;
}

function dayPhrase(dom: CronField, dow: CronField): string | null {
  if (isAny(dom) && isAny(dow)) return null;
  const dowText = dowPhrase(dow);
  const domText = monthDayPhrase(dom);
  if (isAny(dom)) return dowText;
  if (isAny(dow)) return domText;
  return `${domText} or ${dowText}`;
}

function weekdayLabels(values: number[]): string[] {
  if (values.length === 7) return [];
  const shifted = values.includes(0) && values.includes(6) ? [...values.filter((value) => value !== 0), 7] : [...values];
  const name = (day: number) => WEEKDAYS[day === 7 ? 0 : day];
  return numericRanges(shifted).map((range) =>
    range.start === range.end ? name(range.start) : `${name(range.start)} through ${name(range.end)}`,
  );
}

function dowPhrase(field: CronField): string {
  const names = weekdayLabels(field.values);
  if (names.length === 0) return 'every day of the week';
  if (names.length === 1 && names[0].includes(' through ')) return names[0];
  return `on ${listText(names)}`;
}

function monthDayPhrase(field: CronField): string {
  const ranges = numericRanges(field.values);
  if (ranges.length === 1 && ranges[0].start === ranges[0].end) return `on day ${ranges[0].start} of the month`;
  const parts = ranges.map((range) => (range.start === range.end ? String(range.start) : `${range.start} through ${range.end}`));
  return `on days ${listText(parts)} of the month`;
}

function monthPhrase(field: CronField): string | null {
  if (isAny(field) || field.values.length === 12) return null;
  const ranges = numericRanges(field.values);
  const parts = ranges.map((range) =>
    range.start === range.end ? MONTHS[range.start - 1] : `${MONTHS[range.start - 1]} through ${MONTHS[range.end - 1]}`,
  );
  return `in ${listText(parts)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function timePhrase(second: CronField | null, minute: CronField, hour: CronField): string {
  const secondZero = !second || (second.values.length === 1 && second.values[0] === 0);
  const minuteAny = isAny(minute);
  const hourAny = isAny(hour);
  if (second && isAny(second) && minuteAny && hourAny) return 'Every second';
  if (!second && minuteAny && hourAny) return 'Every minute';
  const minuteStep = /^\*\/(\d+)$/.exec(minute.raw);
  if (minuteStep && hourAny && secondZero) {
    const n = Number(minuteStep[1]);
    return n === 1 ? 'Every minute' : `Every ${n} minutes`;
  }
  if (second && second.values.length === 1 && minute.values.length === 1 && hour.values.length === 1) {
    return `At ${pad(hour.values[0])}:${pad(minute.values[0])}:${pad(second.values[0])}`;
  }
  if (secondZero && minute.values.length === 1 && hour.values.length === 1) {
    return `At ${pad(hour.values[0])}:${pad(minute.values[0])}`;
  }
  if (secondZero && minute.values.length === 1 && hourAny) return `At minute ${minute.values[0]} of every hour`;
  const hourStep = /^\*\/(\d+)$/.exec(hour.raw);
  if (hourStep && secondZero && minute.values.length === 1) {
    return `At minute ${pad(minute.values[0])} of every ${hourStep[1]} hours`;
  }
  if (secondZero && hour.values.length === 1 && minute.values.length > 1) {
    const hh = pad(hour.values[0]);
    return `At ${listText(minute.values.map((value) => `${hh}:${pad(value)}`))}`;
  }
  return `When the time matches ${[second?.raw, minute.raw, hour.raw].filter(Boolean).join(' ')}`;
}

function summaryOf(second: CronField | null, minute: CronField, hour: CronField, dom: CronField, month: CronField, dow: CronField): string {
  const time = timePhrase(second, minute, hour);
  const day = dayPhrase(dom, dow);
  const monthText = monthPhrase(month);
  let text = time;
  if (day) text += day.startsWith('on ') ? ` ${day}` : `, ${day}`;
  else if (!monthText && /^At \d{2}:\d{2}/.test(time)) text += ' every day';
  if (monthText) text += `, ${monthText}`;
  return text;
}

function dayMatches(civil: CivilTime, dom: CronField, dow: CronField): boolean {
  const domOk = dom.values.includes(civil.day);
  const weekday = new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay();
  const dowOk = dow.values.includes(weekday);
  if (dom.unrestricted && dow.unrestricted) return true;
  if (dom.unrestricted) return dowOk;
  if (dow.unrestricted) return domOk;
  return domOk || dowOk;
}

function advance(
  second: CronField | null,
  minute: CronField,
  hour: CronField,
  dom: CronField,
  month: CronField,
  dow: CronField,
  year: CronField | null,
  start: CivilTime,
): CivilTime | null {
  let civil = { ...start };
  for (let i = 0; i < 5000; i += 1) {
    if (year && !year.unrestricted && !year.values.includes(civil.year)) {
      const nextYear = year.values.find((value) => value > civil.year);
      if (nextYear == null) return null;
      civil = { year: nextYear, month: month.values[0] ?? 1, day: 1, hour: 0, minute: 0, second: 0 };
      continue;
    }
    if (!month.values.includes(civil.month)) {
      const nextMonth = month.values.find((value) => value > civil.month);
      civil = nextMonth
        ? { year: civil.year, month: nextMonth, day: 1, hour: 0, minute: 0, second: 0 }
        : { year: civil.year + 1, month: month.values[0] ?? 1, day: 1, hour: 0, minute: 0, second: 0 };
      continue;
    }
    if (!dayMatches(civil, dom, dow)) {
      civil = addSeconds({ ...civil, hour: 0, minute: 0, second: 0 }, 86_400);
      continue;
    }
    if (!hour.values.includes(civil.hour)) {
      const nextHour = hour.values.find((value) => value > civil.hour);
      civil =
        nextHour == null
          ? addSeconds({ ...civil, hour: 0, minute: 0, second: 0 }, 86_400)
          : { ...civil, hour: nextHour, minute: 0, second: 0 };
      continue;
    }
    if (!minute.values.includes(civil.minute)) {
      const nextMinute = minute.values.find((value) => value > civil.minute);
      civil = nextMinute == null ? addSeconds({ ...civil, minute: 0, second: 0 }, 3600) : { ...civil, minute: nextMinute, second: 0 };
      continue;
    }
    if (second && !second.values.includes(civil.second)) {
      const nextSecond = second.values.find((value) => value > civil.second);
      civil = nextSecond == null ? addSeconds({ ...civil, second: 0 }, 60) : { ...civil, second: nextSecond };
      continue;
    }
    return civil;
  }
  return null;
}

function nextRuns(
  second: CronField | null,
  minute: CronField,
  hour: CronField,
  dom: CronField,
  month: CronField,
  dow: CronField,
  year: CronField | null,
  from: Date,
  count: number,
  timeZone: string,
): { iso: string; label: string }[] {
  let civil = second ? addSeconds(instantToCivil(from, timeZone), 1) : addSeconds({ ...instantToCivil(from, timeZone), second: 0 }, 60);
  const found: { iso: string; label: string }[] = [];
  const seen = new Set<number>();
  for (let guard = 0; found.length < count && guard < 1000; guard += 1) {
    const match = advance(second, minute, hour, dom, month, dow, year, civil);
    if (!match) break;
    const resolved = civilToInstant(match, timeZone);
    if (resolved.kind !== 'gap') {
      for (const instant of resolved.alternates ?? [resolved.instant]) {
        if (instant.getTime() > from.getTime() && !seen.has(instant.getTime())) {
          seen.add(instant.getTime());
          found.push({ iso: instant.toISOString(), label: formatZoned(instant, timeZone) });
          if (found.length >= count) break;
        }
      }
    }
    civil = addSeconds(match, second ? 1 : 60);
  }
  return found;
}

export function explainCron(expression: string, from: Date = new Date(), count = 5, timeZone = 'UTC'): Result<CronExplanation> {
  try {
    if (!isValidTimeZone(timeZone)) return err(`Unknown time zone “${timeZone}”.`);
    const compact = expression.trim().replace(/\s+/g, ' ');
    if (!compact) return err('Enter a cron expression.');
    const alias = ALIASES[compact.toLowerCase()] ? compact.toLowerCase() : null;
    const body = alias ? ALIASES[alias] : compact;
    const parts = body.split(' ');
    if (parts.length < 5 || parts.length > 7) {
      return err('Use 5 fields (minute hour day month weekday), 6 with seconds first, or 7 with a year.');
    }
    const hasSeconds = parts.length >= 6;
    const fields = hasSeconds ? parts : [null, ...parts];
    const second = fields[0] ? parseField(fields[0], SECOND) : null;
    const minute = parseField(fields[1] ?? '', MINUTE);
    const hour = parseField(fields[2] ?? '', HOUR);
    const dom = parseField(fields[3] ?? '', DOM);
    const month = parseField(fields[4] ?? '', MONTH);
    const dow = parseField(fields[5] ?? '', DOW);
    const year = parts.length === 7 ? parseField(parts[6], YEAR) : null;
    const shown = [second, minute, hour, dom, month, dow, year].filter((field): field is CronField => field !== null);
    const runs = Math.min(20, Math.max(1, count));
    return ok({
      expression: body,
      alias,
      summary: summaryOf(second, minute, hour, dom, month, dow),
      fields: shown,
      hasSeconds,
      next: nextRuns(second, minute, hour, dom, month, dow, year, from, runs, timeZone),
    });
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Could not read that expression.');
  }
}
