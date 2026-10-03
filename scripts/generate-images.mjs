// Generates the default Open Graph image, favicons, and the sample post illustration.
// Run once with: node scripts/generate-images.mjs   (outputs are committed; not part of the build)
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const serif = "'IBM Plex Serif', Georgia, serif";
const sans = "'IBM Plex Sans', Arial, sans-serif";

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14181d"/><stop offset="1" stop-color="#1d2630"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="120" r="220" fill="#7ab8ff" opacity="0.07"/>
  <circle cx="1110" cy="560" r="160" fill="#f4c26b" opacity="0.06"/>
  <rect x="96" y="150" width="72" height="6" rx="3" fill="#f4c26b"/>
  <text x="96" y="268" font-family="${serif}" font-size="92" font-weight="600" fill="#f3f1ec">Milan Niroula</text>
  <text x="96" y="346" font-family="${sans}" font-size="36" fill="#b9c2cc">Research notes &amp; article write-ups</text>
  <text x="96" y="398" font-family="${sans}" font-size="30" fill="#8b96a3">AI · Software engineering · Design · Systems at scale</text>
  <text x="96" y="530" font-family="${sans}" font-size="26" fill="#7ab8ff">mimi146.github.io/blog</text>
</svg>`;

const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#14181d"/>
  <text x="32" y="43" text-anchor="middle" font-family="Georgia, 'IBM Plex Serif', serif" font-size="30" font-weight="700" fill="#f3f1ec">MN</text>
  <rect x="18" y="49" width="28" height="3" rx="1.5" fill="#f4c26b"/>
</svg>`;

// Sample post illustration: a client retrying a request with the same idempotency key.
const row = (y, label, color, note) => `
  <rect x="300" y="${y - 26}" width="${label.length * 12 + 40}" height="44" rx="10" fill="${color}" opacity="0.14"/>
  <text x="320" y="${y + 3}" font-family="${sans}" font-size="21" fill="#1d2125">${label}</text>
  <text x="980" y="${y + 3}" text-anchor="end" font-family="${sans}" font-size="19" fill="#555d66">${note}</text>`;
const illustration = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="560" viewBox="0 0 1200 560">
  <rect width="1200" height="560" fill="#fcfbf8"/>
  <text x="80" y="80" font-family="${serif}" font-size="34" font-weight="600" fill="#1d2125">One key, many attempts, one charge</text>
  <line x1="220" y1="140" x2="220" y2="500" stroke="#c9c3b8" stroke-width="3"/>
  ${[180, 280, 380, 470].map((y) => `<circle cx="220" cy="${y}" r="9" fill="#0a58a8"/>`).join('')}
  <text x="80" y="186" font-family="${sans}" font-size="20" fill="#555d66">t = 0s</text>
  <text x="80" y="286" font-family="${sans}" font-size="20" fill="#555d66">t = 1s</text>
  <text x="80" y="386" font-family="${sans}" font-size="20" fill="#555d66">t = 3s</text>
  <text x="80" y="476" font-family="${sans}" font-size="20" fill="#555d66">t = 7s</text>
  ${row(180, 'POST /charges  Idempotency-Key: 7f3a…', '#0a58a8', 'timeout, no reply')}
  ${row(280, 'retry with the same key', '#0a58a8', 'request still in flight: 409')}
  ${row(380, 'retry with the same key', '#0a58a8', '200, the stored result')}
  ${row(470, 'retry with the same key', '#2e7d32', 'same 200, no second charge')}
</svg>`;

await sharp(Buffer.from(og)).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile('public/og-default.png');
await writeFile('public/favicon.svg', favicon.trim() + '\n');
await sharp(Buffer.from(favicon)).resize(32, 32).png().toFile('public/favicon-32.png');
await sharp(Buffer.from(favicon)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(illustration)).png().toFile('src/content/blog/idempotency-keys-safe-retries/retry-timeline.png');
console.log('Images generated.');
