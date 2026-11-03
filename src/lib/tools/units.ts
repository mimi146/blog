import { err, ok, type Result } from './result';

export interface Unit {
  id: string;
  label: string;
  /** Multiply a quantity in this unit by `toBase` to reach the category base. */
  toBase: number;
}

export type UnitCategory = 'data' | 'throughput' | 'latency';

const KB = 1000;
const MB = 1000 ** 2;
const GB = 1000 ** 3;
const TB = 1000 ** 4;
const KIB = 1024;
const MIB = 1024 ** 2;
const GIB = 1024 ** 3;
const TIB = 1024 ** 4;

export const DATA_UNITS: Unit[] = [
  { id: 'bit', label: 'bit', toBase: 1 / 8 },
  { id: 'B', label: 'byte (B)', toBase: 1 },
  { id: 'kB', label: 'kilobyte (kB, 1000 B)', toBase: KB },
  { id: 'MB', label: 'megabyte (MB, 1000² B)', toBase: MB },
  { id: 'GB', label: 'gigabyte (GB, 1000³ B)', toBase: GB },
  { id: 'TB', label: 'terabyte (TB, 1000⁴ B)', toBase: TB },
  { id: 'KiB', label: 'kibibyte (KiB, 1024 B)', toBase: KIB },
  { id: 'MiB', label: 'mebibyte (MiB, 1024² B)', toBase: MIB },
  { id: 'GiB', label: 'gibibyte (GiB, 1024³ B)', toBase: GIB },
  { id: 'TiB', label: 'tebibyte (TiB, 1024⁴ B)', toBase: TIB },
];

/** Throughput units convert to bits per second. */
export const THROUGHPUT_UNITS: Unit[] = [
  { id: 'bps', label: 'bit/s', toBase: 1 },
  { id: 'kbps', label: 'kbit/s (1000 bit/s)', toBase: KB },
  { id: 'Mbps', label: 'Mbit/s (1000² bit/s)', toBase: MB },
  { id: 'Gbps', label: 'Gbit/s (1000³ bit/s)', toBase: GB },
  { id: 'Bps', label: 'byte/s', toBase: 8 },
  { id: 'KBps', label: 'kB/s (1000 byte/s)', toBase: KB * 8 },
  { id: 'MBps', label: 'MB/s (1000² byte/s)', toBase: MB * 8 },
  { id: 'KiBps', label: 'KiB/s (1024 byte/s)', toBase: KIB * 8 },
  { id: 'MiBps', label: 'MiB/s (1024² byte/s)', toBase: MIB * 8 },
];

/** Latency units convert to seconds. */
export const LATENCY_UNITS: Unit[] = [
  { id: 'ns', label: 'nanosecond', toBase: 1e-9 },
  { id: 'us', label: 'microsecond', toBase: 1e-6 },
  { id: 'ms', label: 'millisecond', toBase: 1e-3 },
  { id: 's', label: 'second', toBase: 1 },
  { id: 'min', label: 'minute', toBase: 60 },
  { id: 'h', label: 'hour', toBase: 3600 },
];

export const UNIT_CATEGORIES: Record<UnitCategory, { label: string; units: Unit[] }> = {
  data: { label: 'Data size', units: DATA_UNITS },
  throughput: { label: 'Throughput', units: THROUGHPUT_UNITS },
  latency: { label: 'Latency', units: LATENCY_UNITS },
};

export function unitById(units: Unit[], id: string): Unit | undefined {
  return units.find((unit) => unit.id === id);
}

export function convertUnit(value: number, from: Unit, to: Unit): Result<number> {
  if (!Number.isFinite(value)) return err('Enter a finite number.');
  if (from.toBase === 0 || to.toBase === 0) return err('That unit cannot be converted.');
  return ok((value * from.toBase) / to.toBase);
}

/** Seconds to move `bytes` at `bitsPerSecond`. */
export function transferSeconds(bytes: number, bitsPerSecond: number): Result<number> {
  if (!Number.isFinite(bytes) || bytes < 0) return err('Enter a file size of zero or more.');
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return err('Enter a throughput greater than zero.');
  return ok((bytes * 8) / bitsPerSecond);
}
