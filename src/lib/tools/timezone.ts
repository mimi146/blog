import { daysInMonth } from './calendar';
import { err, ok, type Result } from './result';

export interface CivilTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export const COMMON_TIME_ZONES = [
  'UTC',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/New_York',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Moscow',
  'Europe/Paris',
  'Pacific/Auckland',
  'Pacific/Honolulu',
] as const;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function readParts(instant: Date, timeZone: string): CivilTime {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) map[part.type] = part.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Wall-clock minus UTC, in milliseconds, at this instant. */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const civil = readParts(instant, timeZone);
  const asUtc = Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second);
  return asUtc - instant.getTime();
}

export function instantToCivil(instant: Date, timeZone: string): CivilTime {
  return readParts(instant, timeZone);
}

function sameCivil(a: CivilTime, b: CivilTime): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute && a.second === b.second;
}

export interface ZonedInstant {
  instant: Date;
  kind: 'exact' | 'gap' | 'overlap';
  alternates?: Date[];
}

export function civilToInstant(civil: CivilTime, timeZone: string): ZonedInstant {
  if (!isValidTimeZone(timeZone)) throw new Error(`Unknown time zone “${timeZone}”.`);
  const utcGuess = Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second);
  const offsetGuess = timeZoneOffsetMs(new Date(utcGuess), timeZone);
  let instant = new Date(utcGuess - offsetGuess);
  const offsetAtInstant = timeZoneOffsetMs(instant, timeZone);
  if (offsetGuess !== offsetAtInstant) instant = new Date(utcGuess - offsetAtInstant);

  if (!sameCivil(instantToCivil(instant, timeZone), civil)) {
    return { instant, kind: 'gap' };
  }

  for (const probeMs of [2 * 3_600_000, -2 * 3_600_000]) {
    const otherOffset = timeZoneOffsetMs(new Date(instant.getTime() + probeMs), timeZone);
    if (otherOffset === timeZoneOffsetMs(instant, timeZone)) continue;
    const other = new Date(utcGuess - otherOffset);
    if (other.getTime() !== instant.getTime() && sameCivil(instantToCivil(other, timeZone), civil)) {
      const [earlier, later] = instant < other ? [instant, other] : [other, instant];
      return { instant: earlier, kind: 'overlap', alternates: [earlier, later] };
    }
  }
  return { instant, kind: 'exact' };
}

export function parseDateTimeLocal(value: string): CivilTime | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const civil: CivilTime = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: match[6] ? Number(match[6]) : 0,
  };
  if (civil.year < 1 || civil.year > 9999 || civil.month < 1 || civil.month > 12) return null;
  if (civil.day < 1 || civil.day > daysInMonth(civil.year, civil.month)) return null;
  if (civil.hour > 23 || civil.minute > 59 || civil.second > 59) return null;
  return civil;
}

export function addSeconds(civil: CivilTime, seconds: number): CivilTime {
  const ms = Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second) + seconds * 1000;
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

export function formatZoned(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(instant);
}

export interface ZoneConversion {
  instant: Date;
  kind: ZonedInstant['kind'];
  fromLabel: string;
  toLabel: string;
  alternates: { instant: Date; label: string }[];
}

export function convertZone(localValue: string, fromZone: string, toZone: string): Result<ZoneConversion> {
  const civil = parseDateTimeLocal(localValue);
  if (!civil) return err('Enter a date and time.');
  if (!isValidTimeZone(fromZone)) return err(`Unknown time zone “${fromZone}”. Use an IANA name such as Asia/Kolkata.`);
  if (!isValidTimeZone(toZone)) return err(`Unknown time zone “${toZone}”. Use an IANA name such as America/New_York.`);
  let zoned: ZonedInstant;
  try {
    zoned = civilToInstant(civil, fromZone);
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Could not convert that time.');
  }
  if (zoned.kind === 'gap') {
    return err('That local time does not exist in the source zone because clocks spring forward.');
  }
  const alternates = (zoned.alternates ?? [zoned.instant]).map((instant) => ({
    instant,
    label: formatZoned(instant, toZone),
  }));
  return ok({
    instant: zoned.instant,
    kind: zoned.kind,
    fromLabel: formatZoned(zoned.instant, fromZone),
    toLabel: formatZoned(zoned.instant, toZone),
    alternates,
  });
}
