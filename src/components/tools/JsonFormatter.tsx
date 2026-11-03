import { useState } from 'preact/hooks';
import {
  csvToJson,
  diffJson,
  escapeJson,
  formatChange,
  formatJson,
  jsonToCsv,
  minifyJson,
  parseJson,
  unescapeJson,
} from '../../lib/tools/json';
import { Alert, Field, ToolForm, valueOf } from './ui';
import { copyText } from '../../lib/tools/copy';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [other, setOther] = useState('');
  const [indent, setIndent] = useState(2);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  function show(result: { ok: true; value: string } | { ok: false; error: string }, success: string) {
    if (!result.ok) {
      setError(result.error);
      setNote('');
      return;
    }
    setError('');
    setOutput(result.value);
    setNote(success);
  }

  async function toYaml() {
    const mod = await import('../../lib/tools/json-yaml');
    show(mod.jsonToYaml(input), 'Converted to YAML.');
  }
  async function fromYaml() {
    const mod = await import('../../lib/tools/json-yaml');
    show(mod.yamlToJson(input, indent), 'Converted YAML to JSON.');
  }

  function compare() {
    const result = diffJson(input, other);
    if (!result.ok) {
      setError(result.error);
      setNote('');
      return;
    }
    setError('');
    const lines = result.value.changes.map((change) => formatChange(change));
    setOutput(lines.length ? lines.join('\n') : 'The two JSON values match.');
    setNote(
      result.value.truncated
        ? 'Showing the first 200 changes.'
        : `${result.value.changes.length} change${result.value.changes.length === 1 ? '' : 's'}.`,
    );
  }

  return (
    <ToolForm>
      <Field id="json-input" label="JSON">
        <textarea id="json-input" value={input} onInput={(event) => setInput(valueOf(event))} spellcheck={false} autoComplete="off" />
      </Field>
      <Field id="json-indent" label="Indent">
        <select id="json-indent" value={indent} onChange={(event) => setIndent(Number(valueOf(event)))}>
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
        </select>
      </Field>
      <div className="tool-actions">
        <button className="tool-btn" type="button" onClick={() => show(formatJson(input, indent), 'Formatted.')}>
          Format
        </button>
        <button className="tool-btn secondary" type="button" onClick={() => show(minifyJson(input), 'Minified.')}>
          Minify
        </button>
        <button
          className="tool-btn secondary"
          type="button"
          onClick={() => {
            const parsed = parseJson(input);
            if (!parsed.ok) show(parsed, '');
            else {
              setError('');
              setOutput('');
              setNote('Valid JSON.');
            }
          }}
        >
          Validate
        </button>
        <button className="tool-btn secondary" type="button" onClick={() => void toYaml()}>
          JSON to YAML
        </button>
        <button className="tool-btn secondary" type="button" onClick={() => void fromYaml()}>
          YAML to JSON
        </button>
        <button className="tool-btn secondary" type="button" onClick={() => show(jsonToCsv(input), 'Converted to CSV.')}>
          JSON to CSV
        </button>
        <button className="tool-btn secondary" type="button" onClick={() => show(csvToJson(input, indent), 'Converted CSV to JSON.')}>
          CSV to JSON
        </button>
        <button
          className="tool-btn secondary"
          type="button"
          onClick={() => show({ ok: true, value: escapeJson(input) }, 'Escaped as a JSON string.')}
        >
          Escape
        </button>
        <button className="tool-btn secondary" type="button" onClick={() => show(unescapeJson(input), 'Unescaped.')}>
          Unescape
        </button>
      </div>
      <Field id="json-other" label="Second JSON for a diff" hint="Optional. Compare it with the first box.">
        <textarea
          id="json-other"
          value={other}
          onInput={(event) => setOther(valueOf(event))}
          spellcheck={false}
          autoComplete="off"
          aria-describedby="json-other-hint"
        />
      </Field>
      <div className="tool-actions">
        <button className="tool-btn secondary" type="button" onClick={compare}>
          Compare JSON
        </button>
        <button
          className="tool-btn secondary"
          type="button"
          onClick={() => void copyText(output).then((ok) => setNote(ok ? 'Copied.' : 'Could not copy from this browser.'))}
        >
          Copy output
        </button>
      </div>
      <Alert message={error} />
      <p className="tool-status" role="status" aria-live="polite">
        {note}
      </p>
      {output ? <pre className="tool-output">{output}</pre> : null}
    </ToolForm>
  );
}
