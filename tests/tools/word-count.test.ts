import { describe, expect, it } from 'vitest';
import { countText } from '../../src/lib/tools/word-count';

describe('countText', () => {
  it('splits words on whitespace and counts code points', () => {
    const counts = countText('hello  world');
    expect(counts.words).toBe(2);
    expect(counts.characters).toBe(12);
    expect(counts.charactersNoSpaces).toBe(10);
    expect(countText('👍').characters).toBe(1);
  });

  it('counts sentences, paragraphs, and reading time', () => {
    const counts = countText('Hello.\n\nWorld!');
    expect(counts.sentences).toBe(2);
    expect(counts.paragraphs).toBe(2);
    expect(counts.readingMinutes).toBeCloseTo(2 / 230, 6);
    expect(countText('').words).toBe(0);
  });
});
