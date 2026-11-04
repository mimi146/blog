import { replaceRegex, testRegex } from './regex';

interface RegexJob {
  kind: 'test' | 'replace';
  pattern: string;
  flags: string;
  text: string;
  replacement?: string;
}

self.onmessage = (event: MessageEvent<RegexJob>) => {
  const job = event.data;
  const result =
    job.kind === 'replace'
      ? replaceRegex(job.pattern, job.flags, job.text, job.replacement ?? '')
      : testRegex(job.pattern, job.flags, job.text);
  self.postMessage(result);
};
