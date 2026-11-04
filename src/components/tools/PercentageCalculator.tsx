import { useState } from 'preact/hooks';
import { percentChange, percentOf, whatPercent } from '../../lib/tools/percentage';
import { parseNumberList, percentile, type PercentileMethod } from '../../lib/tools/percentile';
import { formatNumber } from '../../lib/tools/format';
import { Alert, Field, valueOf } from './ui';

type Tab = 'percentage' | 'percentile';
const TABS: Tab[] = ['percentage', 'percentile'];

function num(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export default function PercentageCalculator() {
  const [tab, setTab] = useState<Tab>('percentage');
  const [percent, setPercent] = useState('');
  const [total, setTotal] = useState('');
  const [part, setPart] = useState('');
  const [whole, setWhole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [list, setList] = useState('');
  const [p, setP] = useState('90');
  const [method, setMethod] = useState<PercentileMethod>('inclusive');

  function onTabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = TABS.indexOf(tab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = TABS.length - 1;
    const id = TABS[next];
    setTab(id);
    queueMicrotask(() => document.getElementById(`pct-tab-${id}`)?.focus());
  }

  const ofResult = percent.trim() && total.trim() ? percentOf(num(percent), num(total)) : null;
  const whatResult = part.trim() && whole.trim() ? whatPercent(num(part), num(whole)) : null;
  const changeResult = from.trim() && to.trim() ? percentChange(num(from), num(to)) : null;
  const parsedList = list.trim() ? parseNumberList(list) : null;
  const percentileResult = parsedList?.ok && p.trim() ? percentile(parsedList.value, num(p), method) : null;

  return (
    <div className="tool-panel">
      <div className="tool-tabs" role="tablist" aria-label="Calculator">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`pct-tab-${id}`}
            aria-controls={`pct-panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={onTabKey}
          >
            {id === 'percentage' ? 'Percentage' : 'Percentile'}
          </button>
        ))}
      </div>
      {tab === 'percentage' ? (
        <div role="tabpanel" id="pct-panel-percentage" aria-labelledby="pct-tab-percentage" className="tool-grid">
          <fieldset>
            <legend>What is X% of Y?</legend>
            <div className="tool-grid two">
              <Field id="pct-x" label="Percentage">
                <input id="pct-x" inputMode="decimal" value={percent} onInput={(event) => setPercent(valueOf(event))} />
              </Field>
              <Field id="pct-y" label="Of">
                <input id="pct-y" inputMode="decimal" value={total} onInput={(event) => setTotal(valueOf(event))} />
              </Field>
            </div>
            {ofResult ? <p className="tool-result">{ofResult.ok ? formatNumber(ofResult.value) : ofResult.error}</p> : null}
          </fieldset>
          <fieldset>
            <legend>X is what percent of Y?</legend>
            <div className="tool-grid two">
              <Field id="pct-part" label="Part">
                <input id="pct-part" inputMode="decimal" value={part} onInput={(event) => setPart(valueOf(event))} />
              </Field>
              <Field id="pct-whole" label="Whole">
                <input id="pct-whole" inputMode="decimal" value={whole} onInput={(event) => setWhole(valueOf(event))} />
              </Field>
            </div>
            {whatResult ? <p className="tool-result">{whatResult.ok ? `${formatNumber(whatResult.value)}%` : whatResult.error}</p> : null}
          </fieldset>
          <fieldset>
            <legend>Percent change</legend>
            <div className="tool-grid two">
              <Field id="pct-from" label="From">
                <input id="pct-from" inputMode="decimal" value={from} onInput={(event) => setFrom(valueOf(event))} />
              </Field>
              <Field id="pct-to" label="To">
                <input id="pct-to" inputMode="decimal" value={to} onInput={(event) => setTo(valueOf(event))} />
              </Field>
            </div>
            {changeResult ? (
              <p className="tool-result">{changeResult.ok ? `${formatNumber(changeResult.value)}%` : changeResult.error}</p>
            ) : null}
          </fieldset>
        </div>
      ) : (
        <div role="tabpanel" id="pct-panel-percentile" aria-labelledby="pct-tab-percentile" className="tool-grid">
          <Field id="pct-list" label="Numbers" hint="Separate values with commas, spaces, or new lines.">
            <textarea
              id="pct-list"
              value={list}
              onInput={(event) => setList(valueOf(event))}
              spellcheck={false}
              aria-describedby="pct-list-hint"
            />
          </Field>
          <div className="tool-grid two">
            <Field id="pct-p" label="Percentile">
              <input id="pct-p" inputMode="decimal" value={p} onInput={(event) => setP(valueOf(event))} />
            </Field>
            <Field id="pct-method" label="Method">
              <select id="pct-method" value={method} onChange={(event) => setMethod(valueOf(event) as PercentileMethod)}>
                <option value="inclusive">Inclusive (spreadsheet PERCENTILE.INC)</option>
                <option value="exclusive">Exclusive (PERCENTILE.EXC)</option>
                <option value="nearest">Nearest rank</option>
              </select>
            </Field>
          </div>
          {parsedList && !parsedList.ok ? <Alert message={parsedList.error} /> : null}
          {percentileResult ? (
            percentileResult.ok ? (
              <div className="tool-result" role="status" aria-live="polite">
                <p>
                  <strong>{formatNumber(percentileResult.value.value)}</strong>
                </p>
                <p>
                  {percentileResult.value.count} values, from {formatNumber(percentileResult.value.min)} to{' '}
                  {formatNumber(percentileResult.value.max)}.
                </p>
              </div>
            ) : (
              <Alert message={percentileResult.error} />
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
