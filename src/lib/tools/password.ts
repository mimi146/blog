const AMBIGUOUS = /[0Ool1I]/g;
const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
} as const;

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export function passwordAlphabet(options: PasswordOptions): string[] {
  const selected: string[] = [];
  if (options.lower) selected.push(SETS.lower);
  if (options.upper) selected.push(SETS.upper);
  if (options.digits) selected.push(SETS.digits);
  if (options.symbols) selected.push(SETS.symbols);
  return selected.map((set) => (options.excludeAmbiguous ? set.replace(AMBIGUOUS, '') : set)).filter((set) => set.length > 0);
}

export function randomIndex(max: number): number {
  if (max <= 1) return 0;
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0];
    if (value < limit) return value % max;
  }
}

export function generatePassword(options: PasswordOptions, random: (max: number) => number = randomIndex): string {
  if (!Number.isInteger(options.length) || options.length < 8 || options.length > 128) {
    throw new Error('Use a length from 8 to 128.');
  }
  const classes = passwordAlphabet(options);
  if (classes.length === 0) throw new Error('Choose at least one character set.');
  const pool = classes.join('');
  const chars: string[] = [];
  if (options.length >= classes.length) {
    for (const set of classes) chars.push(set[random(set.length)] ?? '');
  }
  while (chars.length < options.length) chars.push(pool[random(pool.length)] ?? '');
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function formatUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function uuidV4(bytes?: Uint8Array): string {
  const value = bytes ? Uint8Array.from(bytes) : crypto.getRandomValues(new Uint8Array(16));
  if (value.length !== 16) throw new Error('UUID v4 needs 16 bytes.');
  value[6] = (value[6] & 0x0f) | 0x40;
  value[8] = (value[8] & 0x3f) | 0x80;
  return formatUuid(value);
}

/** UUID version 7: 48-bit Unix time in milliseconds, then random bits (RFC 9562). */
export function uuidV7(nowMs: number, bytes?: Uint8Array): string {
  if (!Number.isInteger(nowMs) || nowMs < 0 || nowMs > 0xff_ffff_ffff_ff) throw new Error('UUID v7 needs a millisecond timestamp.');
  const value = bytes ? Uint8Array.from(bytes) : crypto.getRandomValues(new Uint8Array(16));
  if (value.length !== 16) throw new Error('UUID v7 needs 16 random bytes.');
  const timestamp = BigInt(nowMs);
  value[0] = Number((timestamp >> 40n) & 0xffn);
  value[1] = Number((timestamp >> 32n) & 0xffn);
  value[2] = Number((timestamp >> 24n) & 0xffn);
  value[3] = Number((timestamp >> 16n) & 0xffn);
  value[4] = Number((timestamp >> 8n) & 0xffn);
  value[5] = Number(timestamp & 0xffn);
  value[6] = (value[6] & 0x0f) | 0x70;
  value[8] = (value[8] & 0x3f) | 0x80;
  return formatUuid(value);
}

export async function digestHex(text: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
