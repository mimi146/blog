import { useEffect, useState } from 'preact/hooks';
import { ageBetween } from '../../lib/tools/age';
import { Alert, Field, ToolForm, valueOf } from './ui';

function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function AgeCalculator() {
  const [birth, setBirth] = useState('');
  const [asOf, setAsOf] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReturnType<typeof ageBetween> | null>(null);

  useEffect(() => {
    setAsOf(todayISO());
  }, []);

  function calculate() {
    const age = ageBetween(birth, asOf);
    if (!age.ok) {
      setError(age.error);
      setResult(null);
      return;
    }
    setError('');
    setResult(age);
  }

  return (
    <ToolForm onSubmit={calculate}>
      <div className="tool-grid two">
        <Field id="age-birth" label="Date of birth">
          <input id="age-birth" type="date" value={birth} onInput={(event) => setBirth(valueOf(event))} required />
        </Field>
        <Field id="age-asof" label="As of">
          <input id="age-asof" type="date" value={asOf} onInput={(event) => setAsOf(valueOf(event))} required />
        </Field>
      </div>
      <div className="tool-actions">
        <button className="tool-btn" type="submit">
          Calculate age
        </button>
      </div>
      <Alert message={error} />
      {result?.ok ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p>
            <strong>
              {result.value.years} years, {result.value.months} months, {result.value.days} days
            </strong>
          </p>
          <p>
            {result.value.totalDays} days in total, which is {result.value.weeks} weeks and {result.value.extraDays} days.
          </p>
          <p>Born on a {result.value.weekday}.</p>
          <p>
            {result.value.birthdayToday
              ? 'The as-of date is the birthday.'
              : `Next birthday: ${result.value.nextBirthdayLabel} (${result.value.daysUntilBirthday} days).`}
          </p>
        </div>
      ) : null}
    </ToolForm>
  );
}
