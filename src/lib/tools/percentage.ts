import { err, ok, type Result } from './result';

function finite(value: number, label: string): Result<number> {
  if (!Number.isFinite(value)) return err(`Enter a number for ${label}.`);
  return ok(value);
}

export function percentOf(percent: number, total: number): Result<number> {
  const p = finite(percent, 'the percentage');
  if (!p.ok) return p;
  const t = finite(total, 'the total');
  if (!t.ok) return t;
  return ok((p.value / 100) * t.value);
}

export function whatPercent(part: number, whole: number): Result<number> {
  const p = finite(part, 'the part');
  if (!p.ok) return p;
  const w = finite(whole, 'the whole');
  if (!w.ok) return w;
  if (w.value === 0) return err('The whole cannot be zero.');
  return ok((p.value / w.value) * 100);
}

/** Percent change is (new − old) / old × 100. */
export function percentChange(from: number, to: number): Result<number> {
  const start = finite(from, 'the starting number');
  if (!start.ok) return start;
  const end = finite(to, 'the ending number');
  if (!end.ok) return end;
  if (start.value === 0) return err('The starting number cannot be zero.');
  return ok(((end.value - start.value) / start.value) * 100);
}
