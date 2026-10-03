import { createMermaidRenderer } from 'mermaid-isomorphic';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { toText } from 'hast-util-to-text';
import { visitParents } from 'unist-util-visit-parents';
import { createHash } from 'node:crypto';

/**
 * Renders ```mermaid code blocks to static, inline SVG at build time (no client-side JS).
 * Each diagram is rendered twice — a light and a dark version — and CSS shows the one
 * that matches the current site theme (see .mermaid-diagram in global.css).
 *
 * Requires Playwright's Chromium at build time: `npx playwright install chromium`.
 */
let renderer;
const getRenderer = () => (renderer ??= createMermaidRenderer());

// SVG <text> labels instead of HTML-in-foreignObject: they survive HTML serialization (no <br> doubling)
// and aren't affected by the page's CSS.
const baseConfig = {
  fontFamily: 'arial, Helvetica, "Liberation Sans", sans-serif',
  htmlLabels: false,
  flowchart: { htmlLabels: false },
};

function isMermaid(node) {
  if (node.tagName === 'pre') {
    const cls = node.properties?.className ?? [];
    if (Array.isArray(cls) && cls.includes('mermaid')) return true;
    if (node.properties?.dataLanguage === 'mermaid') return true;
    const code = node.children?.find((c) => c.type === 'element' && c.tagName === 'code');
    const codeCls = code?.properties?.className ?? [];
    return Array.isArray(codeCls) && codeCls.includes('language-mermaid');
  }
  return false;
}

export default function rehypeMermaidThemed() {
  return async (tree, file) => {
    const found = [];
    visitParents(tree, 'element', (node, ancestors) => {
      if (isMermaid(node)) {
        found.push({ node, parent: ancestors.at(-1) });
        return 'skip';
      }
    });
    if (!found.length) return;

    const diagrams = found.map(({ node }) => toText(node, { whitespace: 'pre' }).trim());
    // Deterministic, unique-per-page id prefix (SVG ids must not collide between the two themes).
    const id = 'm' + createHash('sha1').update(diagrams.join('\n---\n')).digest('hex').slice(0, 8);
    const render = getRenderer();
    const [light, dark] = await Promise.all([
      render(diagrams, { prefix: `${id}-light`, mermaidConfig: { ...baseConfig, theme: 'default' } }),
      render(diagrams, { prefix: `${id}-dark`, mermaidConfig: { ...baseConfig, theme: 'dark' } }),
    ]);

    found.forEach(({ node, parent }, i) => {
      const l = light[i];
      const d = dark[i];
      if (l.status === 'rejected' || d.status === 'rejected') {
        const reason = (l.status === 'rejected' ? l.reason : d.reason) ?? 'unknown error';
        throw new Error(`Mermaid diagram #${i + 1} in ${file.path ?? 'a post'} failed to render: ${reason}`);
      }
      const label = l.value.title || l.value.description || 'Diagram';
      const wrapper = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['mermaid-diagram'], role: 'img', ariaLabel: label },
        children: [
          { type: 'element', tagName: 'div', properties: { className: ['mermaid-light'] }, children: fromHtmlIsomorphic(l.value.svg, { fragment: true }).children },
          { type: 'element', tagName: 'div', properties: { className: ['mermaid-dark'] }, children: fromHtmlIsomorphic(d.value.svg, { fragment: true }).children },
        ],
      };
      const idx = parent.children.indexOf(node);
      parent.children.splice(idx, 1, wrapper);
    });
  };
}
