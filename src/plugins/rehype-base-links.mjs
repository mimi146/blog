import { visit } from 'unist-util-visit';

/**
 * Prefixes root-relative links and image sources written in Markdown with the site base path,
 * so "[About](/about/)" becomes "/blog/about/" on GitHub Pages.
 * Links that already include the base path are left untouched.
 */
export default function rehypeBaseLinks({ base = '/' } = {}) {
  const prefix = base.replace(/\/$/, '');
  const fix = (value) => {
    if (typeof value !== 'string' || !prefix) return value;
    if (!value.startsWith('/') || value.startsWith('//')) return value;
    if (value === prefix || value.startsWith(prefix + '/')) return value;
    return prefix + value;
  };
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' && node.properties?.href) node.properties.href = fix(node.properties.href);
      if ((node.tagName === 'img' || node.tagName === 'source') && node.properties?.src) node.properties.src = fix(node.properties.src);
    });
  };
}
