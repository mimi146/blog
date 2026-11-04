import { describe, expect, it } from 'vitest';
import { csvToJson, diffJson, formatJson, jsonToCsv, minifyJson, parseJson } from '../../src/lib/tools/json';
import { jsonToYaml, yamlToJson } from '../../src/lib/tools/json-yaml';

describe('JSON tools', () => {
  it('formats, minifies, and reports an invalid location', () => {
    expect(formatJson('{"b":1,"a":2}')).toEqual({ ok: true, value: '{\n  "b": 1,\n  "a": 2\n}' });
    expect(minifyJson('{\n  "a": 1\n}')).toEqual({ ok: true, value: '{"a":1}' });
    const invalid = parseJson('{\n  a: 1\n}');
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error).toContain('Line 2');
  });

  it('round-trips JSON through YAML', () => {
    const yaml = jsonToYaml('{"name":"Ada","n":1,"ok":true}');
    expect(yaml.ok).toBe(true);
    if (!yaml.ok) return;
    expect(yaml.value).toContain('name:');
    expect(yamlToJson(yaml.value)).toEqual({ ok: true, value: '{\n  "name": "Ada",\n  "n": 1,\n  "ok": true\n}' });
  });

  it('round-trips rows through CSV, including quotes', () => {
    const csv = jsonToCsv('[{"name":"Ada, Lovelace","n":1}]');
    expect(csv.ok).toBe(true);
    if (!csv.ok) return;
    expect(csv.value).toBe('name,n\n"Ada, Lovelace",1');
    expect(csvToJson('name,note\nAda,"say ""hi"""')).toEqual({
      ok: true,
      value: '[\n  {\n    "name": "Ada",\n    "note": "say \\"hi\\""\n  }\n]',
    });
  });

  it('diffs added, removed, and replaced values', () => {
    const diff = diffJson('{"a":1,"b":2}', '{"b":3,"c":4}');
    expect(diff.ok).toBe(true);
    if (!diff.ok) return;
    expect(diff.value.changes).toEqual([
      { op: 'remove', path: 'a', value: 1 },
      { op: 'replace', path: 'b', before: 2, after: 3 },
      { op: 'add', path: 'c', value: 4 },
    ]);
  });
});
