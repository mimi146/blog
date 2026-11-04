import { useMemo, useState } from 'preact/hooks';
import {
  DATA_UNITS,
  THROUGHPUT_UNITS,
  UNIT_CATEGORIES,
  convertUnit,
  transferSeconds,
  unitById,
  type UnitCategory,
} from '../../lib/tools/units';
import { formatDuration, formatNumber } from '../../lib/tools/format';
import { Field, ToolForm, valueOf } from './ui';

export default function UnitConverter() {
  const [category, setCategory] = useState<UnitCategory>('data');
  const [amount, setAmount] = useState('1');
  const [fromId, setFromId] = useState('MiB');
  const [toId, setToId] = useState('MB');
  const [size, setSize] = useState('100');
  const [sizeUnit, setSizeUnit] = useState('MB');
  const [rate, setRate] = useState('100');
  const [rateUnit, setRateUnit] = useState('Mbps');

  const units = UNIT_CATEGORIES[category].units;
  const from = unitById(units, fromId) ?? units[0];
  const to = unitById(units, toId) ?? units[1] ?? units[0];
  const converted = useMemo(() => convertUnit(Number(amount), from, to), [amount, from, to]);

  const bytes = useMemo(() => {
    const unit = unitById(DATA_UNITS, sizeUnit) ?? DATA_UNITS[1];
    const value = Number(size);
    if (!Number.isFinite(value)) return null;
    return value * unit.toBase;
  }, [size, sizeUnit]);
  const bitsPerSecond = useMemo(() => {
    const unit = unitById(THROUGHPUT_UNITS, rateUnit) ?? THROUGHPUT_UNITS[2];
    const value = Number(rate);
    if (!Number.isFinite(value)) return null;
    return value * unit.toBase;
  }, [rate, rateUnit]);
  const transfer = bytes != null && bitsPerSecond != null ? transferSeconds(bytes, bitsPerSecond) : null;

  function changeCategory(next: UnitCategory) {
    const list = UNIT_CATEGORIES[next].units;
    setCategory(next);
    setFromId(list[0].id);
    setToId((list[1] ?? list[0]).id);
  }

  return (
    <ToolForm>
      <fieldset>
        <legend>Convert</legend>
        <Field id="unit-cat" label="Category">
          <select id="unit-cat" value={category} onChange={(event) => changeCategory(valueOf(event) as UnitCategory)}>
            {Object.entries(UNIT_CATEGORIES).map(([id, item]) => (
              <option key={id} value={id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="unit-amount" label="Amount">
          <input id="unit-amount" inputMode="decimal" value={amount} onInput={(event) => setAmount(valueOf(event))} />
        </Field>
        <div className="tool-grid two">
          <Field id="unit-from" label="From">
            <select id="unit-from" value={from.id} onChange={(event) => setFromId(valueOf(event))}>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="unit-to" label="To">
            <select id="unit-to" value={to.id} onChange={(event) => setToId(valueOf(event))}>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="tool-result" role="status" aria-live="polite">
          {converted.ok ? (
            <>
              <strong>{formatNumber(converted.value)}</strong> {to.label}
            </>
          ) : (
            converted.error
          )}
        </p>
      </fieldset>
      <fieldset>
        <legend>Transfer time</legend>
        <div className="tool-grid two">
          <Field id="xfer-size" label="Size">
            <input id="xfer-size" inputMode="decimal" value={size} onInput={(event) => setSize(valueOf(event))} />
          </Field>
          <Field id="xfer-size-unit" label="Size unit">
            <select id="xfer-size-unit" value={sizeUnit} onChange={(event) => setSizeUnit(valueOf(event))}>
              {DATA_UNITS.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="xfer-rate" label="Rate">
            <input id="xfer-rate" inputMode="decimal" value={rate} onInput={(event) => setRate(valueOf(event))} />
          </Field>
          <Field id="xfer-rate-unit" label="Rate unit">
            <select id="xfer-rate-unit" value={rateUnit} onChange={(event) => setRateUnit(valueOf(event))}>
              {THROUGHPUT_UNITS.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="tool-result" role="status" aria-live="polite">
          {transfer?.ok ? (
            <>
              About <strong>{formatDuration(transfer.value)}</strong> at that rate, ignoring protocol overhead.
            </>
          ) : (
            (transfer?.error ?? 'Enter a size and a rate.')
          )}
        </p>
      </fieldset>
    </ToolForm>
  );
}
