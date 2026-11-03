import { describe, expect, it } from 'vitest';
import { decodeJwt } from '../../src/lib/tools/jwt';

function segment(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function token(header: unknown, payload: unknown, signature = 'sig'): string {
  return `${segment(header)}.${segment(payload)}.${signature}`;
}

describe('decodeJwt', () => {
  it('decodes header and payload without checking the signature', () => {
    const decoded = decodeJwt(
      token({ alg: 'HS256', typ: 'JWT' }, { sub: '123', name: 'Ada', exp: 2_000_000_000, iat: 1_500_000_000 }),
      new Date('2020-01-01T00:00:00Z'),
    );
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.algorithm).toBe('HS256');
    expect(decoded.value.payload).toMatchObject({ sub: '123', name: 'Ada' });
    expect(decoded.value.signature).toBe('sig');
    expect(decoded.value.expired).toBe(false);
    expect(decoded.value.expiresAt).toBe('2033-05-18T03:33:20.000Z');
  });

  it('strips a Bearer prefix and still decodes a bad signature', () => {
    const decoded = decodeJwt(`Bearer ${token({ alg: 'none' }, { sub: 'example' }, 'not-a-real-signature')}`);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.payload).toEqual({ sub: 'example' });
    expect(decoded.value.signature).toBe('not-a-real-signature');
  });

  it('decodes unicode payload text', () => {
    const decoded = decodeJwt(token({ alg: 'HS256' }, { name: 'मिलन' }));
    expect(decoded.ok && decoded.value.payload).toEqual({ name: 'मिलन' });
  });

  it('rejects a token that is not three segments or not JSON', () => {
    expect(decodeJwt('abc').ok).toBe(false);
    expect(decodeJwt(`${segment('nope')}.${segment({ sub: '1' })}.sig`).ok).toBe(false);
  });

  it('marks an expiry in the past', () => {
    const decoded = decodeJwt(token({ alg: 'HS256' }, { exp: 10 }), new Date('2020-01-01T00:00:00Z'));
    expect(decoded.ok && decoded.value.expired).toBe(true);
  });
});
