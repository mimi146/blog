import { err, ok, type Result } from './result';

export type JsonChange =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string; value: unknown }
  | { op: 'replace'; path: string; before: unknown; after: unknown };

const MAX_CHANGES = 200;

export function describeJsonError(message: string, source: string): string {
  const lineCol = /line (\d+) column (\d+)/.exec(message);
  if (lineCol) return `Line ${lineCol[1]}, column ${lineCol[2]}: ${message}`;
  const position = /position (\d+)/.exec(message);
  if (!position) return message;
  let line = 1;
  let column = 1;
  const index = Number(position[1]);
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === '\n') {
      line += 1;
      column = 1;
    } else column += 1;
  }
  return `Line ${line}, column ${column}: ${message}`;
}

export function parseJson(input: string): Result<unknown> {
  if (!input.trim()) return err('Enter some JSON.');
  try {
    return ok(JSON.parse(input));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.';
    return err(describeJsonError(message, input));
  }
}

export function formatJson(input: string, indent = 2): Result<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return ok(JSON.stringify(parsed.value, null, indent));
}

export function minifyJson(input: string): Result<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return ok(JSON.stringify(parsed.value));
}

function csvCell(value: unknown): string {
  if (value == null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function parseCsv(input: string): Result<string[][]> {
  if (!input.trim()) return err('Enter some CSV.');
  const source = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  if (quoted) return err('A quoted CSV field is missing its closing quote.');
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const trimmed = rows.filter((item, index) => !(index === rows.length - 1 && item.length === 1 && item[0] === ''));
  if (trimmed.length === 0) return err('Enter some CSV.');
  return ok(trimmed);
}

export function jsonToCsv(input: string): Result<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  const value = parsed.value;
  let rows: string[][];
  if (Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    const records = value as Record<string, unknown>[];
    const headers: string[] = [];
    for (const record of records) {
      for (const key of Object.keys(record)) if (!headers.includes(key)) headers.push(key);
    }
    rows = [headers, ...records.map((record) => headers.map((key) => csvCell(record[key])))];
    return ok(rows.map((row) => row.join(',')).join('\n'));
  }
  if (Array.isArray(value) && value.every((item) => Array.isArray(item))) {
    rows = (value as unknown[][]).map((row) => row.map((cell) => csvCell(cell)));
    return ok(rows.map((row) => row.join(',')).join('\n'));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    rows = [['key', 'value'], ...entries.map(([key, cell]) => [csvCell(key), csvCell(cell)])];
    return ok(rows.map((row) => row.join(',')).join('\n'));
  }
  return err('CSV export needs a JSON array of objects, an array of arrays, or an object.');
}

export function csvToJson(input: string, indent = 2): Result<string> {
  const table = parseCsv(input);
  if (!table.ok) return table;
  const [header, ...body] = table.value;
  if (!header || header.some((name) => !name.trim())) return err('The first CSV row needs a name for every column.');
  const seen = new Set<string>();
  for (const name of header) {
    if (seen.has(name)) return err(`The column “${name}” is repeated.`);
    seen.add(name);
  }
  const records = body.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((name, index) => {
      record[name] = row[index] ?? '';
    });
    return record;
  });
  return ok(JSON.stringify(records, null, indent));
}

function childPath(path: string, key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? (path ? `${path}.${key}` : key) : `${path}[${JSON.stringify(key)}]`;
}

function diffValues(before: unknown, after: unknown, path: string, changes: JsonChange[], depth: number): void {
  if (changes.length >= MAX_CHANGES) return;
  if (Object.is(before, after)) return;
  const beforeObject = before !== null && typeof before === 'object';
  const afterObject = after !== null && typeof after === 'object';
  if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after) || depth > 40) {
    changes.push({ op: 'replace', path: path || '$', before, after });
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      const next = `${path}[${index}]`;
      if (index >= before.length) changes.push({ op: 'add', path: next, value: after[index] });
      else if (index >= after.length) changes.push({ op: 'remove', path: next, value: before[index] });
      else diffValues(before[index], after[index], next, changes, depth + 1);
      if (changes.length >= MAX_CHANGES) return;
    }
    return;
  }
  const left = before as Record<string, unknown>;
  const right = after as Record<string, unknown>;
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const next = childPath(path, key);
    if (!(key in left)) changes.push({ op: 'add', path: next, value: right[key] });
    else if (!(key in right)) changes.push({ op: 'remove', path: next, value: left[key] });
    else diffValues(left[key], right[key], next, changes, depth + 1);
    if (changes.length >= MAX_CHANGES) return;
  }
}

export function diffJson(left: string, right: string): Result<{ changes: JsonChange[]; truncated: boolean }> {
  const a = parseJson(left);
  if (!a.ok) return err(`First JSON: ${a.error}`);
  const b = parseJson(right);
  if (!b.ok) return err(`Second JSON: ${b.error}`);
  const changes: JsonChange[] = [];
  diffValues(a.value, b.value, '', changes, 0);
  return ok({ changes, truncated: changes.length >= MAX_CHANGES });
}

export function escapeJson(text: string): string {
  return JSON.stringify(text);
}

export function unescapeJson(input: string): Result<string> {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  if (typeof parsed.value !== 'string') return err('That JSON value is not a string.');
  return ok(parsed.value);
}

export function formatChange(change: JsonChange): string {
  if (change.op === 'add') return `add ${change.path}: ${JSON.stringify(change.value)}`;
  if (change.op === 'remove') return `remove ${change.path}: ${JSON.stringify(change.value)}`;
  return `replace ${change.path}: ${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}`;
}
