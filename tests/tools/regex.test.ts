import { describe, expect, it } from 'vitest';
import { replaceRegex, testRegex } from '../../src/lib/tools/regex';

describe('testRegex', () => {
  it('returns the full match and numbered groups', () => {
    const result = testRegex('he(l+)o', '', 'say hello');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.matches).toEqual([{ index: 4, value: 'hello', groups: { '1': 'll' } }]);
  });

  it('advances past an empty match instead of looping', () => {
    const result = testRegex('a*', '', 'b');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.matches.length).toBeLessThan(10);
  });

  it('reports an invalid pattern and replaces with the g flag', () => {
    expect(testRegex('(', '', 'abc').ok).toBe(false);
    const replaced = replaceRegex('a', 'g', 'banana', '');
    expect(replaced).toEqual({ ok: true, value: { output: 'bnn', count: 3 } });
  });
});
