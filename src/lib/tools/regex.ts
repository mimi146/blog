import { err, ok, type Result } from './result';

export interface RegexMatch {
  index: number;
  value: string;
  groups: Record<string, string>;
}

export interface RegexHits {
  matches: RegexMatch[];
  truncated: boolean;
}

const FLAG_PATTERN = /^[gimsuy]*$/;
const MAX_MATCHES = 200;

export function normalizeFlags(flags: string): Result<string> {
  const unique = [...new Set(flags.split(''))].join('');
  if (!FLAG_PATTERN.test(unique)) return err('Flags can only be g, i, m, s, u, or y.');
  if (unique.includes('y')) return err('The sticky flag y is not used by this tester.');
  return ok(unique);
}

export function testRegex(pattern: string, flags: string, text: string): Result<RegexHits> {
  if (pattern.length > 500) return err('Pattern is too long.');
  if (text.length > 20_000) return err('Text is too long. Keep it under 20,000 characters.');
  const parsedFlags = normalizeFlags(flags);
  if (!parsedFlags.ok) return parsedFlags;
  const searchFlags = parsedFlags.value.includes('g') ? parsedFlags.value : `${parsedFlags.value}g`;
  let expression: RegExp;
  try {
    expression = new RegExp(pattern, searchFlags);
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Invalid regular expression.');
  }
  const matches: RegexMatch[] = [];
  let found: RegExpExecArray | null;
  while ((found = expression.exec(text)) && matches.length < MAX_MATCHES) {
    const groups: Record<string, string> = {};
    found.slice(1).forEach((group, index) => {
      if (group !== undefined) groups[String(index + 1)] = group;
    });
    if (found.groups) {
      for (const [name, value] of Object.entries(found.groups)) if (value !== undefined) groups[name] = value;
    }
    matches.push({ index: found.index, value: found[0], groups });
    if (found[0] === '') expression.lastIndex += 1;
  }
  return ok({ matches, truncated: matches.length >= MAX_MATCHES && expression.lastIndex <= text.length });
}

export function replaceRegex(pattern: string, flags: string, text: string, replacement: string): Result<{ output: string; count: number }> {
  if (pattern.length > 500) return err('Pattern is too long.');
  if (text.length > 20_000) return err('Text is too long. Keep it under 20,000 characters.');
  const parsedFlags = normalizeFlags(flags);
  if (!parsedFlags.ok) return parsedFlags;
  try {
    const expression = new RegExp(pattern, parsedFlags.value);
    const hits = testRegex(pattern, parsedFlags.value, text);
    if (!hits.ok) return hits;
    return ok({ output: text.replace(expression, replacement), count: hits.value.matches.length });
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Invalid regular expression.');
  }
}
