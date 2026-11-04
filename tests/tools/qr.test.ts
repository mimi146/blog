import { describe, expect, it } from 'vitest';
import { qrText, vcardPayload, wifiPayload } from '../../src/lib/tools/qr';

const emptyCard = { givenName: '', familyName: '', organization: '', email: '', url: '', phone: '' };

describe('qr payloads', () => {
  it('escapes Wi-Fi separators', () => {
    expect(wifiPayload({ ssid: 'a;b', password: 'p:q\\z', encryption: 'WPA', hidden: true })).toBe(
      'WIFI:T:WPA;S:a\\;b;P:p\\:q\\\\z;H:true;;',
    );
    expect(wifiPayload({ ssid: 'cafe', password: '', encryption: 'nopass', hidden: false })).toBe('WIFI:T:nopass;S:cafe;H:false;;');
  });

  it('escapes vCard reserved characters and omits empty lines', () => {
    const card = vcardPayload({ ...emptyCard, givenName: 'Ada', familyName: 'Lovelace', organization: 'A, B', email: 'ada@example.com' });
    expect(card).toContain('N:Lovelace;Ada;;;');
    expect(card).toContain('ORG:A\\, B');
    expect(card).not.toContain('TEL:');
  });

  it('routes each kind through qrText', () => {
    expect(
      qrText('url', {
        text: '',
        url: ' https://example.com ',
        wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
        vcard: emptyCard,
      }),
    ).toBe('https://example.com');
    expect(() =>
      qrText('text', { text: '', url: '', wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false }, vcard: emptyCard }),
    ).toThrow(/text/i);
  });
});
