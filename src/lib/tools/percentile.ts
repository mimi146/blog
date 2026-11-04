import { err, ok, type Result } from './result';

export type PercentileMethod = 'inclusive' | 'exclusive' | 'nearest';

export interface PercentileResult {
  value: number;
  count: number;
  min: number;
  max: number;
  method: PercentileMethod;
  percentile: number;
}

export function parseNumberList(text: string): Result<number[]> {
  const tokens = text
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return err('Enter at least one number.');
  const values: number[] = [];
  for (const token of tokens) {
    const value = Number(token);
    if (!Number.isFinite(value)) return err(`"${token}" is not a number.`);
    values.push(value);
  }
  return ok(values);
}

/**
 * Inclusive matches Excel PERCENTILE.INC / NIST linear interpolation.
 * Exclusive matches Excel PERCENTILE.EXC.
 * Nearest rank uses ceil(p/100 * n), and the minimum at 0.
 */
export function percentile(values: number[], p: number, method: PercentileMethod): Result<PercentileResult> {
  if (!Number.isFinite(p) || p < 0 || p > 100) return err('Percentile must be between 0 and 100.');
  if (values.length === 0) return err('Enter at least one number.');
  if (values.some((value) => !Number.isFinite(value))) return err('Every value must be a finite number.');

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let value: number;

  if (method === 'nearest') {
    if (p === 0) value = sorted[0];
    else {
      const rank = Math.ceil((p / 100) * n);
      value = sorted[Math.min(n, Math.max(1, rank)) - 1];
    }
  } else if (method === 'exclusive') {
    if (p === 0 || p === 100) return err('The exclusive method uses a percentile between 0 and 100, not the endpoints.');
    const rank = (p / 100) * (n + 1);
    if (rank < 1 || rank > n) return err('This sample is too small for that percentile with the exclusive method.');
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    value = lower === upper ? sorted[lower - 1] : sorted[lower - 1] + (rank - lower) * (sorted[upper - 1] - sorted[lower - 1]);
  } else if (n === 1) {
    value = sorted[0];
  } else {
    const h = (p / 100) * (n - 1);
    const lower = Math.floor(h);
    const upper = Math.ceil(h);
    value = lower === upper ? sorted[lower] : sorted[lower] + (h - lower) * (sorted[upper] - sorted[lower]);
  }

  return ok({ value, count: n, min: sorted[0], max: sorted[n - 1], method, percentile: p });
}
