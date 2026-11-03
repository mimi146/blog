import { useState } from 'preact/hooks';
import { digestHex, generatePassword, uuidV4, uuidV7 } from '../../lib/tools/password';
import { copyText } from '../../lib/tools/copy';
import { Alert, Field, ToolForm, checkedOf, valueOf } from './ui';

export default function PasswordGenerator() {
  const [length, setLength] = useState(20);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [ambiguous, setAmbiguous] = useState(true);
  const [password, setPassword] = useState('');
  const [uuid, setUuid] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [algorithm, setAlgorithm] = useState<'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [hash, setHash] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  function makePassword() {
    try {
      setError('');
      setPassword(generatePassword({ length, lower, upper, digits, symbols, excludeAmbiguous: ambiguous }));
      setNote('New password.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not generate a password.');
    }
  }

  async function hashText() {
    setError('');
    setHash(await digestHex(hashInput, algorithm));
    setNote(`${algorithm} hash.`);
  }

  return (
    <ToolForm onSubmit={makePassword}>
      <fieldset>
        <legend>Password</legend>
        <Field id="pw-length" label={`Length ${length}`}>
          <input id="pw-length" type="range" min="8" max="128" value={length} onInput={(event) => setLength(Number(valueOf(event)))} />
        </Field>
        <div className="tool-checks">
          <label className="tool-check" htmlFor="pw-lower">
            <input id="pw-lower" type="checkbox" checked={lower} onChange={(event) => setLower(checkedOf(event))} /> Lowercase
          </label>
          <label className="tool-check" htmlFor="pw-upper">
            <input id="pw-upper" type="checkbox" checked={upper} onChange={(event) => setUpper(checkedOf(event))} /> Uppercase
          </label>
          <label className="tool-check" htmlFor="pw-digits">
            <input id="pw-digits" type="checkbox" checked={digits} onChange={(event) => setDigits(checkedOf(event))} /> Digits
          </label>
          <label className="tool-check" htmlFor="pw-symbols">
            <input id="pw-symbols" type="checkbox" checked={symbols} onChange={(event) => setSymbols(checkedOf(event))} /> Symbols
          </label>
          <label className="tool-check" htmlFor="pw-ambiguous">
            <input id="pw-ambiguous" type="checkbox" checked={ambiguous} onChange={(event) => setAmbiguous(checkedOf(event))} /> Avoid
            ambiguous characters
          </label>
        </div>
        <div className="tool-actions">
          <button className="tool-btn" type="submit">
            Generate password
          </button>
          <button
            className="tool-btn secondary"
            type="button"
            onClick={() => void copyText(password).then((ok) => setNote(ok ? 'Password copied.' : 'Could not copy.'))}
          >
            Copy password
          </button>
        </div>
        {password ? <pre className="tool-output">{password}</pre> : null}
      </fieldset>
      <fieldset>
        <legend>UUID</legend>
        <div className="tool-actions">
          <button
            className="tool-btn secondary"
            type="button"
            onClick={() => {
              setUuid(uuidV4());
              setNote('UUID v4.');
            }}
          >
            UUID v4
          </button>
          <button
            className="tool-btn secondary"
            type="button"
            onClick={() => {
              setUuid(uuidV7(Date.now()));
              setNote('UUID v7.');
            }}
          >
            UUID v7
          </button>
          <button
            className="tool-btn secondary"
            type="button"
            onClick={() => void copyText(uuid).then((ok) => setNote(ok ? 'UUID copied.' : 'Could not copy.'))}
          >
            Copy UUID
          </button>
        </div>
        {uuid ? <pre className="tool-output">{uuid}</pre> : null}
      </fieldset>
      <fieldset>
        <legend>Hash</legend>
        <Field id="hash-text" label="Text">
          <textarea
            id="hash-text"
            value={hashInput}
            onInput={(event) => setHashInput(valueOf(event))}
            spellcheck={false}
            autoComplete="off"
          />
        </Field>
        <Field id="hash-alg" label="Algorithm">
          <select id="hash-alg" value={algorithm} onChange={(event) => setAlgorithm(valueOf(event) as 'SHA-256' | 'SHA-384' | 'SHA-512')}>
            <option>SHA-256</option>
            <option>SHA-384</option>
            <option>SHA-512</option>
          </select>
        </Field>
        <div className="tool-actions">
          <button className="tool-btn secondary" type="button" onClick={() => void hashText()}>
            Hash
          </button>
        </div>
        {hash ? <pre className="tool-output">{hash}</pre> : null}
      </fieldset>
      <Alert message={error} />
      <p className="tool-status" role="status" aria-live="polite">
        {note}
      </p>
    </ToolForm>
  );
}
