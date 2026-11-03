import { useState } from 'preact/hooks';
import { explainCron } from '../../lib/tools/cron';
import { COMMON_TIME_ZONES } from '../../lib/tools/timezone';
import { Alert, Field, ToolForm, valueOf } from './ui';

const PRESETS = [
  { label: 'Hourly', expression: '0 * * * *' },
  { label: 'Daily', expression: '0 0 * * *' },
  { label: 'Weekdays at 09:30', expression: '30 9 * * 1-5' },
];

export default function CronExplainer() {
  const [expression, setExpression] = useState('30 9 * * 1-5');
  const [zone, setZone] = useState('UTC');
  const [customZone, setCustomZone] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReturnType<typeof explainCron> | null>(null);

  function explain(next = expression) {
    const chosen = customZone.trim() || zone;
    const explained = explainCron(next, new Date(), 8, chosen);
    if (!explained.ok) {
      setError(explained.error);
      setResult(null);
      return;
    }
    setError('');
    setResult(explained);
  }

  return (
    <ToolForm onSubmit={() => explain()}>
      <Field id="cron-expr" label="Expression" hint="Five fields: minute hour day month weekday. Add seconds at the front for six.">
        <input
          id="cron-expr"
          value={expression}
          onInput={(event) => setExpression(valueOf(event))}
          spellcheck={false}
          autoComplete="off"
          aria-describedby="cron-expr-hint"
        />
      </Field>
      <div className="tool-actions">
        {PRESETS.map((preset) => (
          <button
            key={preset.expression}
            className="tool-btn secondary"
            type="button"
            onClick={() => {
              setExpression(preset.expression);
              explain(preset.expression);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="tool-grid two">
        <Field id="cron-zone" label="Wall-clock zone">
          <select id="cron-zone" value={zone} onChange={(event) => setZone(valueOf(event))}>
            {COMMON_TIME_ZONES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="cron-zone-custom" label="Or another IANA zone">
          <input
            id="cron-zone-custom"
            value={customZone}
            onInput={(event) => setCustomZone(valueOf(event))}
            spellcheck={false}
            autoComplete="off"
          />
        </Field>
      </div>
      <div className="tool-actions">
        <button className="tool-btn" type="submit">
          Explain
        </button>
      </div>
      <Alert message={error} />
      {result?.ok ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p>
            <strong>{result.value.summary}</strong>
          </p>
          {result.value.alias ? (
            <p>
              Shortcut {result.value.alias} expands to {result.value.expression}.
            </p>
          ) : null}
          <table className="tool-table">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Value</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {result.value.fields.map((field) => (
                <tr key={field.name}>
                  <th scope="row">{field.name}</th>
                  <td>
                    <code>{field.raw}</code>
                  </td>
                  <td>{field.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Next runs</h2>
          {result.value.next.length ? (
            <ul>
              {result.value.next.map((run) => (
                <li key={run.iso}>
                  {run.label} <span className="tool-hint">({run.iso})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No run was found in the search window.</p>
          )}
        </div>
      ) : null}
    </ToolForm>
  );
}
