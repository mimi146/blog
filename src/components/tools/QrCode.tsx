import { useState } from 'preact/hooks';
import { qrText, type QrKind, type WifiEncryption } from '../../lib/tools/qr';
import { Alert, Field, ToolForm, checkedOf, valueOf } from './ui';

export default function QrCode() {
  const [kind, setKind] = useState<QrKind>('url');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState<WifiEncryption>('WPA');
  const [hidden, setHidden] = useState(false);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [svg, setSvg] = useState('');
  const [pngUrl, setPngUrl] = useState('');
  const [error, setError] = useState('');

  async function generate() {
    setError('');
    try {
      const payload = qrText(kind, {
        text,
        url,
        wifi: { ssid, password, encryption, hidden },
        vcard: { givenName, familyName, organization, email, url: site, phone },
      });
      const QRCode = await import('qrcode');
      const markup = await QRCode.toString(payload, {
        type: 'svg',
        errorCorrectionLevel: level,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, payload, {
        errorCorrectionLevel: level,
        margin: 2,
        width: 280,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not build a PNG in this browser. The SVG is still available.');
      if (pngUrl) URL.revokeObjectURL(pngUrl);
      setPngUrl(URL.createObjectURL(blob));
      setSvg(markup);
    } catch (caught) {
      setSvg('');
      setError(caught instanceof Error ? caught.message : 'Could not build that code.');
    }
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qr-code.svg';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ToolForm onSubmit={() => void generate()}>
      <Field id="qr-kind" label="Content">
        <select id="qr-kind" value={kind} onChange={(event) => setKind(valueOf(event) as QrKind)}>
          <option value="text">Text</option>
          <option value="url">URL</option>
          <option value="wifi">Wi-Fi</option>
          <option value="vcard">vCard</option>
        </select>
      </Field>
      {kind === 'text' ? (
        <Field id="qr-text" label="Text">
          <textarea id="qr-text" value={text} onInput={(event) => setText(valueOf(event))} spellcheck={false} />
        </Field>
      ) : null}
      {kind === 'url' ? (
        <Field id="qr-url" label="URL" hint="Include https:// if you want a web address. UTM parameters can stay in the URL.">
          <input
            id="qr-url"
            type="text"
            inputMode="url"
            value={url}
            onInput={(event) => setUrl(valueOf(event))}
            autoComplete="off"
            spellcheck={false}
            aria-describedby="qr-url-hint"
          />
        </Field>
      ) : null}
      {kind === 'wifi' ? (
        <div className="tool-grid">
          <Field id="qr-ssid" label="Network name">
            <input id="qr-ssid" value={ssid} onInput={(event) => setSsid(valueOf(event))} autoComplete="off" />
          </Field>
          <Field id="qr-pass" label="Password" hint="Anyone who can see the image can join the network.">
            <input
              id="qr-pass"
              type="text"
              value={password}
              onInput={(event) => setPassword(valueOf(event))}
              autoComplete="off"
              spellcheck={false}
              aria-describedby="qr-pass-hint"
            />
          </Field>
          <Field id="qr-enc" label="Encryption">
            <select id="qr-enc" value={encryption} onChange={(event) => setEncryption(valueOf(event) as WifiEncryption)}>
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No password</option>
            </select>
          </Field>
          <label className="tool-check" htmlFor="qr-hidden">
            <input id="qr-hidden" type="checkbox" checked={hidden} onChange={(event) => setHidden(checkedOf(event))} />
            Hidden network
          </label>
        </div>
      ) : null}
      {kind === 'vcard' ? (
        <div className="tool-grid two">
          <Field id="qr-given" label="Given name">
            <input id="qr-given" value={givenName} onInput={(event) => setGivenName(valueOf(event))} autoComplete="off" />
          </Field>
          <Field id="qr-family" label="Family name">
            <input id="qr-family" value={familyName} onInput={(event) => setFamilyName(valueOf(event))} autoComplete="off" />
          </Field>
          <Field id="qr-org" label="Organization">
            <input id="qr-org" value={organization} onInput={(event) => setOrganization(valueOf(event))} autoComplete="off" />
          </Field>
          <Field id="qr-email" label="Email">
            <input id="qr-email" type="email" value={email} onInput={(event) => setEmail(valueOf(event))} autoComplete="off" />
          </Field>
          <Field id="qr-site" label="Website">
            <input id="qr-site" type="text" inputMode="url" value={site} onInput={(event) => setSite(valueOf(event))} autoComplete="off" />
          </Field>
          <Field id="qr-phone" label="Phone">
            <input id="qr-phone" type="tel" value={phone} onInput={(event) => setPhone(valueOf(event))} autoComplete="off" />
          </Field>
        </div>
      ) : null}
      <Field id="qr-level" label="Error correction">
        <select id="qr-level" value={level} onChange={(event) => setLevel(valueOf(event) as 'L' | 'M' | 'Q' | 'H')}>
          <option value="L">Low</option>
          <option value="M">Medium</option>
          <option value="Q">Quartile</option>
          <option value="H">High</option>
        </select>
      </Field>
      <div className="tool-actions">
        <button className="tool-btn" type="submit">
          Generate QR code
        </button>
        {pngUrl ? (
          <a className="tool-btn secondary" href={pngUrl} download="qr-code.png">
            Download PNG
          </a>
        ) : null}
        {svg ? (
          <button className="tool-btn secondary" type="button" onClick={downloadSvg}>
            Download SVG
          </button>
        ) : null}
      </div>
      <Alert message={error} />
      <div className="qr-preview" aria-live="polite">
        {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p>The code will appear here, black on white so a phone can scan it.</p>}
      </div>
    </ToolForm>
  );
}
