import { useEffect, useState } from 'preact/hooks';
import { COMMON_TIME_ZONES, convertZone, formatZoned, isValidTimeZone } from '../../lib/tools/timezone';
import { Alert, Field, ToolForm, valueOf } from './ui';

function ZoneFields({
  id,
  label,
  zone,
  custom,
  onZone,
  onCustom,
}: {
  id: string;
  label: string;
  zone: string;
  custom: string;
  onZone: (value: string) => void;
  onCustom: (value: string) => void;
}) {
  return (
    <div className="tool-grid">
      <Field id={id} label={label}>
        <select id={id} value={zone} onChange={(event) => onZone(valueOf(event))}>
          {COMMON_TIME_ZONES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${id}-custom`} label="Or another IANA zone" hint="Leave blank to use the list. Example: America/Anchorage.">
        <input
          id={`${id}-custom`}
          value={custom}
          onInput={(event) => onCustom(valueOf(event))}
          autoComplete="off"
          spellcheck={false}
          aria-describedby={`${id}-custom-hint`}
        />
      </Field>
    </div>
  );
}

export default function TimeZoneConverter() {
  const [when, setWhen] = useState('');
  const [fromZone, setFromZone] = useState('UTC');
  const [toZone, setToZone] = useState('Asia/Kolkata');
  const [fromCustom, setFromCustom] = useState('');
  const [toCustom, setToCustom] = useState('');
  const [localZone, setLocalZone] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReturnType<typeof convertZone> | null>(null);

  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setWhen(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && isValidTimeZone(detected)) setLocalZone(detected);
  }, []);

  function sourceZone(): string {
    return fromCustom.trim() || fromZone;
  }
  function targetZone(): string {
    return toCustom.trim() || toZone;
  }

  function convert() {
    const converted = convertZone(when, sourceZone(), targetZone());
    if (!converted.ok) {
      setError(converted.error);
      setResult(null);
      return;
    }
    setError('');
    setResult(converted);
  }

  function useLocal() {
    if (!localZone) return;
    if ((COMMON_TIME_ZONES as readonly string[]).includes(localZone)) {
      setFromZone(localZone);
      setFromCustom('');
    } else {
      setFromCustom(localZone);
    }
  }

  const rows = result?.ok ? [targetZone(), ...COMMON_TIME_ZONES.filter((zone) => zone !== targetZone())] : [];

  return (
    <ToolForm onSubmit={convert}>
      <Field id="tz-when" label="Date and time" hint="This is the wall-clock time in the source zone.">
        <input
          id="tz-when"
          type="datetime-local"
          value={when}
          onInput={(event) => setWhen(valueOf(event))}
          aria-describedby="tz-when-hint"
          required
        />
      </Field>
      <ZoneFields id="tz-from" label="From" zone={fromZone} custom={fromCustom} onZone={setFromZone} onCustom={setFromCustom} />
      <ZoneFields id="tz-to" label="To" zone={toZone} custom={toCustom} onZone={setToZone} onCustom={setToCustom} />
      <div className="tool-actions">
        <button className="tool-btn" type="submit">
          Convert
        </button>
        {localZone ? (
          <button className="tool-btn secondary" type="button" onClick={useLocal}>
            Use my zone ({localZone}) as the source
          </button>
        ) : null}
      </div>
      <Alert message={error} />
      {result?.ok ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p>
            <strong>{result.value.toLabel}</strong>
          </p>
          <p>Same instant in the source zone: {result.value.fromLabel}.</p>
          {result.value.kind === 'overlap' ? (
            <p>
              That local time happens twice. The earlier instant is shown above. The later one reads {result.value.alternates[1]?.label}.
            </p>
          ) : null}
        </div>
      ) : null}
      <details>
        <summary>This instant in other zones</summary>
        {result?.ok ? (
          <table className="tool-table">
            <thead>
              <tr>
                <th scope="col">Zone</th>
                <th scope="col">Local time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((zone) => (
                <tr key={zone}>
                  <th scope="row">{zone}</th>
                  <td>{formatZoned(result.value.instant, zone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="tool-hint">Convert a time to fill this table.</p>
        )}
      </details>
    </ToolForm>
  );
}
