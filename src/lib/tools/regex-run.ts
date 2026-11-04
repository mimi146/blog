import type { Result } from './result';
import type { RegexHits } from './regex';

export type RegexResponse = Result<RegexHits> | Result<{ output: string; count: number }>;

export interface RegexJob {
  kind: 'test' | 'replace';
  pattern: string;
  flags: string;
  text: string;
  replacement?: string;
}

/** Run a pattern off the main thread and stop it if it backtracks for too long. */
export function runRegex(job: RegexJob, timeoutMs = 1000): Promise<RegexResponse> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./regex-worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve({ ok: false, error: 'Could not start the regex worker in this browser.' });
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        ok: false,
        error: 'That pattern took too long and was stopped. It may backtrack catastrophically. Shorten the text or simplify the pattern.',
      });
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<RegexResponse>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, error: 'The regular expression failed to run.' });
    };
    worker.postMessage(job);
  });
}
