export type QrKind = 'text' | 'url' | 'wifi' | 'vcard';
export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface WifiInput {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}

export interface VCardInput {
  givenName: string;
  familyName: string;
  organization: string;
  email: string;
  url: string;
  phone: string;
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

export function wifiPayload(input: WifiInput): string {
  const ssid = input.ssid.trim();
  if (!ssid) throw new Error('Enter the network name.');
  if (input.encryption !== 'nopass' && !input.password) throw new Error('Enter the Wi-Fi password, or choose no password.');
  const hidden = input.hidden ? 'true' : 'false';
  if (input.encryption === 'nopass') return `WIFI:T:nopass;S:${escapeWifi(ssid)};H:${hidden};;`;
  return `WIFI:T:${input.encryption};S:${escapeWifi(ssid)};P:${escapeWifi(input.password)};H:${hidden};;`;
}

export function vcardPayload(input: VCardInput): string {
  const given = input.givenName.trim();
  const family = input.familyName.trim();
  const full = [given, family].filter(Boolean).join(' ');
  if (!full && !input.organization.trim() && !input.email.trim()) {
    throw new Error('Enter a name, organization, or email for the card.');
  }
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(family)};${escapeVCard(given)};;;`,
    `FN:${escapeVCard(full || input.organization.trim())}`,
  ];
  if (input.organization.trim()) lines.push(`ORG:${escapeVCard(input.organization.trim())}`);
  if (input.phone.trim()) lines.push(`TEL:${escapeVCard(input.phone.trim())}`);
  if (input.email.trim()) lines.push(`EMAIL:${escapeVCard(input.email.trim())}`);
  if (input.url.trim()) lines.push(`URL:${escapeVCard(input.url.trim())}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

export function qrText(kind: QrKind, fields: { text: string; url: string; wifi: WifiInput; vcard: VCardInput }): string {
  if (kind === 'text') {
    if (!fields.text) throw new Error('Enter the text to encode.');
    return fields.text;
  }
  if (kind === 'url') {
    const url = fields.url.trim();
    if (!url) throw new Error('Enter a URL.');
    return url;
  }
  if (kind === 'wifi') return wifiPayload(fields.wifi);
  return vcardPayload(fields.vcard);
}
