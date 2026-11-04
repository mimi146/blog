import { describe, expect, it } from 'vitest';
import { generatePassword, uuidV4, uuidV7 } from '../../src/lib/tools/password';

describe('generatePassword', () => {
  it('includes every selected class and skips ambiguous characters', () => {
    let cursor = 0;
    const random = (max: number) => {
      const index = cursor % max;
      cursor += 1;
      return index;
    };
    const password = generatePassword(
      { length: 16, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: true },
      random,
    );
    expect(password).toHaveLength(16);
    expect(password).toMatch(/[a-hj-km-np-z]/);
    expect(password).toMatch(/[A-HJ-NP-Z]/);
    expect(password).toMatch(/[2-9]/);
    expect(password).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?]/);
    expect(password).not.toMatch(/[0Ool1I]/);
  });

  it('rejects an empty character set', () => {
    expect(() =>
      generatePassword({ length: 12, lower: false, upper: false, digits: false, symbols: false, excludeAmbiguous: false }, () => 0),
    ).toThrow(/character set/);
  });
});

describe('uuid', () => {
  it('sets the version and variant bits', () => {
    const v4 = uuidV4(new Uint8Array(16));
    expect(v4[14]).toBe('4');
    expect('89ab').toContain(v4[19]);
    const v7 = uuidV7(0x01, new Uint8Array(16));
    expect(v7.startsWith('00000000-0001-7')).toBe(true);
    expect(v7[19]).toBe('8');
  });
});
