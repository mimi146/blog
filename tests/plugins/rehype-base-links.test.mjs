import { describe, it, expect } from 'vitest';
import rehypeBaseLinks from '../../src/plugins/rehype-base-links.mjs';

/** Build a minimal hast element node. */
const el = (tagName, properties = {}) => ({ type: 'element', tagName, properties, children: [] });

/** Wrap a list of element nodes in a hast root. */
const root = (children) => ({ type: 'root', children });

/** Run the plugin's transformer against a tree and return it mutated. */
const run = (tree, options) => {
  const transform = rehypeBaseLinks(options);
  transform(tree);
  return tree;
};

describe('rehype-base-links with base "/blog"', () => {
  it('prefixes a root-relative anchor href', () => {
    const node = el('a', { href: '/about/' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.href).toBe('/blog/about/');
  });

  it('leaves an already-prefixed href unchanged', () => {
    const node = el('a', { href: '/blog/x/' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.href).toBe('/blog/x/');
  });

  it('leaves the bare base href unchanged', () => {
    const node = el('a', { href: '/blog' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.href).toBe('/blog');
  });

  it('leaves a protocol-relative href unchanged', () => {
    const node = el('a', { href: '//cdn/x' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.href).toBe('//cdn/x');
  });

  it('leaves an external absolute href unchanged', () => {
    const node = el('a', { href: 'https://example.com/x' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.href).toBe('https://example.com/x');
  });

  it('leaves a non-root-relative href unchanged', () => {
    const node = el('a', { href: 'about/' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.href).toBe('about/');
  });

  it('rewrites a root-relative img src', () => {
    const node = el('img', { src: '/images/x.png' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.src).toBe('/blog/images/x.png');
  });

  it('rewrites a root-relative source src', () => {
    const node = el('source', { src: '/media/x.webp' });
    run(root([node]), { base: '/blog' });
    expect(node.properties.src).toBe('/blog/media/x.webp');
  });

  it('leaves nodes without href or src untouched', () => {
    const node = el('span', {});
    run(root([node]), { base: '/blog' });
    expect(node.properties).toEqual({});
  });

  it('handles a base with a trailing slash the same as without', () => {
    const node = el('a', { href: '/about/' });
    run(root([node]), { base: '/blog/' });
    expect(node.properties.href).toBe('/blog/about/');
  });
});

describe('rehype-base-links with default base "/"', () => {
  it('leaves a root-relative href unchanged', () => {
    const node = el('a', { href: '/about/' });
    run(root([node]));
    expect(node.properties.href).toBe('/about/');
  });

  it('leaves an img src unchanged', () => {
    const node = el('img', { src: '/images/x.png' });
    run(root([node]), { base: '/' });
    expect(node.properties.src).toBe('/images/x.png');
  });
});
