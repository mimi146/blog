import { useState } from 'preact/hooks';
import { runRegex } from '../../lib/tools/regex-run';
import type { RegexHits } from '../../lib/tools/regex';
import { Alert, Field, ToolForm, checkedOf, valueOf } from './ui';

const FLAGS = [
  { id: 'g', label: 'g global', checked: true },
  { id: 'i', label: 'i ignore case', checked: false },
  { id: 'm', label: 'm multiline', checked: false },
  { id: 's', label: 's dot matches newline', checked: false },
  { id: 'u', label: 'u unicode', checked: false },
] as const;

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [replacement, setReplacement] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({ g: true, i: false, m: false, s: false, u: false });
  const [error, setError] = useState('');
  const [hits, setHits] = useState<RegexHits | null>(null);
  const [replaced, setReplaced] = useState('');

  function flagString(): string {
    return FLAGS.map((flag) => (flags[flag.id] ? flag.id : '')).join('');
  }

  async function run(kind: 'test' | 'replace') {
    setError('');
    setHits(null);
    setReplaced('');
    const result = await runRegex({ kind, pattern, flags: flagString(), text, replacement });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if ('matches' in result.value) setHits(result.value);
    else setReplaced(result.value.output);
  }

  return (
    <ToolForm onSubmit={() => void run('test')}>
      <Field id="re-pattern" label="Pattern" hint="JavaScript syntax, without slash delimiters.">
        <input
          id="re-pattern"
          value={pattern}
          onInput={(event) => setPattern(valueOf(event))}
          spellcheck={false}
          autoComplete="off"
          aria-describedby="re-pattern-hint"
        />
      </Field>
      <fieldset>
        <legend>Flags</legend>
        <div className="tool-checks">
          {FLAGS.map((flag) => (
            <label key={flag.id} className="tool-check" htmlFor={`re-flag-${flag.id}`}>
              <input
                id={`re-flag-${flag.id}`}
                type="checkbox"
                checked={flags[flag.id]}
                onChange={(event) => setFlags({ ...flags, [flag.id]: checkedOf(event) })}
              />
              {flag.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="re-text" label="Text">
        <textarea id="re-text" value={text} onInput={(event) => setText(valueOf(event))} spellcheck={false} />
      </Field>
      <Field id="re-replace" label="Replacement" hint="Used by the Replace button. An empty replacement deletes each match.">
        <input
          id="re-replace"
          value={replacement}
          onInput={(event) => setReplacement(valueOf(event))}
          spellcheck={false}
          autoComplete="off"
          aria-describedby="re-replace-hint"
        />
      </Field>
      <div className="tool-actions">
        <button className="tool-btn" type="submit">
          Find matches
        </button>
        <button className="tool-btn secondary" type="button" onClick={() => void run('replace')}>
          Replace
        </button>
      </div>
      <Alert message={error} />
      {hits ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p>
            {hits.matches.length} match{hits.matches.length === 1 ? '' : 'es'}
            {hits.truncated ? ' (showing the first 200)' : ''}.
          </p>
          {hits.matches.length ? (
            <ol>
              {hits.matches.map((match) => (
                <li key={`${match.index}-${match.value}`}>
                  <code>{match.value || '(empty)'}</code> at index {match.index}
                  {Object.keys(match.groups).length
                    ? ` — groups: ${Object.entries(match.groups)
                        .map(([key, value]) => `${key}=${value}`)
                        .join(', ')}`
                    : ''}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
      {replaced ? (
        <div>
          <p className="tool-status">Replacement</p>
          <pre className="tool-output">{replaced}</pre>
        </div>
      ) : null}
    </ToolForm>
  );
}
