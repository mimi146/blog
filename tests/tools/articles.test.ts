import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARTICLES } from '../../src/lib/tools/articles';
import { TOOLS } from '../../src/lib/tools/catalog';

function words(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

describe('tool pages', () => {
  it('gives every tool 300 or more words of original copy', () => {
    for (const tool of TOOLS) {
      expect(words(ARTICLES[tool.slug] ?? ''), tool.slug).toBeGreaterThanOrEqual(300);
    }
  });

  it('loads each tool as a visible island and keeps the privacy line in the template', () => {
    const layout = readFileSync('src/layouts/ToolLayout.astro', 'utf8');
    expect(layout).toContain('Runs locally in your browser. Nothing is uploaded.');
    expect(layout).toContain('WebApplication');
    expect(layout).toContain('BreadcrumbList');
    const pages = readdirSync('src/pages/tools').filter((name) => name.endsWith('.astro') && name !== 'index.astro');
    expect(pages).toHaveLength(TOOLS.length);
    for (const page of pages) {
      const source = readFileSync(`src/pages/tools/${page}`, 'utf8');
      expect(source).toContain('client:visible');
      expect(source).toContain('ToolLayout');
    }
    expect(readFileSync('src/components/Header.astro', 'utf8')).toContain("label: 'Tools'");
  });
});
