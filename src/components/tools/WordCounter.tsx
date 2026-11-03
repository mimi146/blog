import { useMemo, useState } from 'preact/hooks';
import { PLATFORM_LIMITS, countText } from '../../lib/tools/word-count';
import { formatNumber } from '../../lib/tools/format';
import { Field, ToolForm, valueOf } from './ui';

export default function WordCounter() {
  const [text, setText] = useState('');
  const counts = useMemo(() => countText(text), [text]);
  const reading = counts.words === 0 ? '0 min' : counts.readingMinutes < 1 ? '< 1 min' : `${formatNumber(counts.readingMinutes)} min`;

  return (
    <ToolForm>
      <Field id="word-text" label="Text">
        <textarea id="word-text" value={text} onInput={(event) => setText(valueOf(event))} />
      </Field>
      <div className="count-grid" aria-live="polite">
        <div>
          <strong>{counts.words}</strong>
          <span>Words</span>
        </div>
        <div>
          <strong>{counts.characters}</strong>
          <span>Characters</span>
        </div>
        <div>
          <strong>{counts.charactersNoSpaces}</strong>
          <span>Characters without spaces</span>
        </div>
        <div>
          <strong>{counts.sentences}</strong>
          <span>Sentences</span>
        </div>
        <div>
          <strong>{counts.paragraphs}</strong>
          <span>Paragraphs</span>
        </div>
        <div>
          <strong>{reading}</strong>
          <span>Reading time at 230 wpm</span>
        </div>
      </div>
      <div className="tool-grid">
        {PLATFORM_LIMITS.map((limit) => {
          const over = counts.characters > limit.max;
          return (
            <div key={limit.name} className={over ? 'limit-row is-over' : 'limit-row'}>
              <span>{limit.name}</span>
              <span>
                {counts.characters} / {limit.max}
                {over ? ', over the usual limit' : ', within the usual limit'}
              </span>
              <div className="limit-track" aria-hidden="true">
                <div className="limit-fill" style={{ width: `${Math.min(100, (counts.characters / limit.max) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </ToolForm>
  );
}
