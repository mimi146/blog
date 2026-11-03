import { parse, stringify } from 'yaml';
import { parseJson } from './json';
import { err, ok, type Result } from './result';

export function jsonToYaml(input: string): Result<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return ok(stringify(parsed.value));
}

export function yamlToJson(input: string, indent = 2): Result<string> {
  if (!input.trim()) return err('Enter some YAML.');
  try {
    const value = parse(input, { schema: 'core' });
    if (typeof value === 'undefined') return err('That YAML did not contain a value.');
    return ok(JSON.stringify(value, null, indent));
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Invalid YAML.');
  }
}
