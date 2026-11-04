import { err, ok, type Result } from './result';

export interface JwtDecoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerText: string;
  payloadText: string;
  signature: string;
  algorithm: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  notBefore: string | null;
  expired: boolean | null;
  notYetValid: boolean | null;
}

function decodeSegment(segment: string): string {
  const cleaned = segment.replace(/-/g, '+').replace(/_/g, '/');
  if (!cleaned || cleaned.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(cleaned)) {
    throw new Error('A token segment is not valid base64url.');
  }
  const padded = cleaned + (cleaned.length % 4 === 0 ? '' : '='.repeat(4 - (cleaned.length % 4)));
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readObject(text: string, label: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`The ${label} is not a JSON object.`);
  return value as Record<string, unknown>;
}

function claimDate(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Decode a JWT. The signature is returned unchanged and is not checked. */
export function decodeJwt(token: string, now: Date = new Date()): Result<JwtDecoded> {
  const trimmed = token.trim().replace(/^Bearer\s+/i, '');
  if (!trimmed) return err('Paste a JWT.');
  if (trimmed.length > 100_000) return err('That token is too long to decode here.');
  const parts = trimmed.split('.');
  if (parts.length < 2 || parts.length > 3) return err('A JWT has two or three segments separated by dots.');
  try {
    const headerText = decodeSegment(parts[0]);
    const payloadText = decodeSegment(parts[1]);
    const header = readObject(headerText, 'header');
    const payload = readObject(payloadText, 'payload');
    const expiresAt = claimDate(payload.exp);
    const notBefore = claimDate(payload.nbf);
    const nowMs = now.getTime();
    return ok({
      header,
      payload,
      headerText: JSON.stringify(header, null, 2),
      payloadText: JSON.stringify(payload, null, 2),
      signature: parts[2] ?? '',
      algorithm: typeof header.alg === 'string' ? header.alg : null,
      issuedAt: claimDate(payload.iat),
      expiresAt,
      notBefore,
      expired: typeof payload.exp === 'number' ? nowMs >= payload.exp * 1000 : null,
      notYetValid: typeof payload.nbf === 'number' ? nowMs < payload.nbf * 1000 : null,
    });
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Could not decode that token.');
  }
}
