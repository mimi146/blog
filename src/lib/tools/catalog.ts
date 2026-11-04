export interface ToolInfo {
  slug: string;
  href: string;
  h1: string;
  description: string;
  lede: string;
  summary: string;
  related: readonly string[];
  applicationCategory: 'DeveloperApplication' | 'UtilitiesApplication';
}

export const TOOLS: readonly ToolInfo[] = [
  {
    slug: 'time-zone-converter',
    href: '/tools/time-zone-converter/',
    h1: 'Time zone converter',
    description:
      'Convert a date and time between IANA time zones, including Asia/Kolkata, UTC, and US zones. The conversion runs in your browser and nothing is uploaded.',
    lede: 'Turn a wall-clock time in one IANA zone into the same instant in another, including daylight-saving gaps.',
    summary: 'Convert a wall-clock time between IANA time zones.',
    related: ['unit-converter', 'cron-explainer', 'age-calculator'],
    applicationCategory: 'UtilitiesApplication',
  },
  {
    slug: 'image-compressor',
    href: '/tools/image-compressor/',
    h1: 'Image compressor and HEIC to JPG',
    description:
      'Compress JPEG, PNG, and WebP images and convert HEIC to JPG in your browser. Photos stay on your device and are never uploaded.',
    lede: 'Resize and re-encode a picture in the browser, including iPhone HEIC files decoded locally.',
    summary: 'Compress JPEG, PNG, and WebP, and convert HEIC to JPG locally.',
    related: ['qr-code', 'password-generator', 'json-formatter'],
    applicationCategory: 'UtilitiesApplication',
  },
  {
    slug: 'json-formatter',
    href: '/tools/json-formatter/',
    h1: 'JSON formatter and validator',
    description: 'Format, validate, and minify JSON, and convert it to YAML or CSV. Parsing runs locally so your data is not uploaded.',
    lede: 'Pretty-print, minify, validate, and convert JSON without sending it anywhere.',
    summary: 'Format, validate, minify, and convert JSON.',
    related: ['jwt-decoder', 'regex-tester', 'cron-explainer'],
    applicationCategory: 'DeveloperApplication',
  },
  {
    slug: 'word-counter',
    href: '/tools/word-counter/',
    h1: 'Word and character counter',
    description:
      'Count words and characters, with usual limits for titles, meta descriptions, and social posts. The count runs in your browser.',
    lede: 'Count words, characters, sentences, and reading time as you type.',
    summary: 'Count words and characters against common length limits.',
    related: ['regex-tester', 'percentage-calculator', 'json-formatter'],
    applicationCategory: 'UtilitiesApplication',
  },
  {
    slug: 'age-calculator',
    href: '/tools/age-calculator/',
    h1: 'Age calculator',
    description: 'Calculate age in years, months, and days from a date of birth, plus the next birthday. The math stays on your device.',
    lede: 'Get a calendar age in years, months, and days, and the date of the next birthday.',
    summary: 'Calculate exact age and the next birthday.',
    related: ['time-zone-converter', 'percentage-calculator', 'word-counter'],
    applicationCategory: 'UtilitiesApplication',
  },
  {
    slug: 'qr-code',
    href: '/tools/qr-code/',
    h1: 'QR code generator',
    description: 'Make a static QR code for text, a URL, Wi-Fi, or a vCard. The code is created in your browser and nothing is uploaded.',
    lede: 'Build a static QR code for text, a link, a Wi-Fi network, or a contact card.',
    summary: 'Create a static QR code for text, a URL, Wi-Fi, or a vCard.',
    related: ['image-compressor', 'password-generator', 'word-counter'],
    applicationCategory: 'UtilitiesApplication',
  },
  {
    slug: 'percentage-calculator',
    href: '/tools/percentage-calculator/',
    h1: 'Percentage calculator',
    description:
      'Calculate a percentage of a number, what percent one number is of another, percent change, and percentiles. Results stay on your device.',
    lede: 'Work out percentages, percent change, and a percentile of a list of numbers.',
    summary: 'Calculate percentages and percentiles.',
    related: ['unit-converter', 'age-calculator', 'word-counter'],
    applicationCategory: 'UtilitiesApplication',
  },
  {
    slug: 'jwt-decoder',
    href: '/tools/jwt-decoder/',
    h1: 'JWT decoder',
    description:
      'Decode a JSON Web Token header and payload in your browser. The signature is not verified, and the token is not uploaded.',
    lede: 'Read a JWT header and payload locally. The signature is not checked.',
    summary: 'Decode a JWT header and payload without verifying it.',
    related: ['json-formatter', 'password-generator', 'regex-tester'],
    applicationCategory: 'DeveloperApplication',
  },
  {
    slug: 'cron-explainer',
    href: '/tools/cron-explainer/',
    h1: 'Cron expression explainer',
    description: 'Explain a cron expression in plain language and list the next run times. Parsing runs locally and nothing is uploaded.',
    lede: 'Read a five-field cron expression, or one with seconds, and see the next runs.',
    summary: 'Explain a cron expression and list the next runs.',
    related: ['time-zone-converter', 'json-formatter', 'jwt-decoder'],
    applicationCategory: 'DeveloperApplication',
  },
  {
    slug: 'regex-tester',
    href: '/tools/regex-tester/',
    h1: 'Regex tester',
    description: 'Test a JavaScript regular expression, inspect capture groups, and try a replacement. The pattern runs in your browser.',
    lede: 'Try a JavaScript regular expression against sample text and inspect each match.',
    summary: 'Test a JavaScript regular expression and its groups.',
    related: ['json-formatter', 'word-counter', 'jwt-decoder'],
    applicationCategory: 'DeveloperApplication',
  },
  {
    slug: 'password-generator',
    href: '/tools/password-generator/',
    h1: 'Password, UUID, and hash generator',
    description: 'Generate a password, UUID v4 or v7, and a SHA-256 hash with Web Crypto. Nothing is uploaded or stored.',
    lede: 'Generate passwords and UUIDs, and hash text, with the Web Crypto API in your browser.',
    summary: 'Generate a password, a UUID, or a SHA hash locally.',
    related: ['jwt-decoder', 'json-formatter', 'unit-converter'],
    applicationCategory: 'DeveloperApplication',
  },
  {
    slug: 'unit-converter',
    href: '/tools/unit-converter/',
    h1: 'Unit converter',
    description:
      'Convert bytes, bits, bandwidth, and latency, including decimal and binary prefixes. The math runs locally and nothing is uploaded.',
    lede: 'Convert data size, throughput, and latency, and estimate how long a transfer takes.',
    summary: 'Convert bytes, bandwidth, and latency.',
    related: ['time-zone-converter', 'percentage-calculator', 'json-formatter'],
    applicationCategory: 'UtilitiesApplication',
  },
] as const;

const BY_SLUG = new Map(TOOLS.map((tool) => [tool.slug, tool]));

export function getTool(slug: string): ToolInfo {
  const tool = BY_SLUG.get(slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}

export function relatedTools(slug: string): ToolInfo[] {
  return getTool(slug).related.map((related) => getTool(related));
}
