import { describe, it, expect } from 'vitest';
import remarkRequireAlt from '../../src/plugins/remark-require-alt.mjs';

/** Wrap mdast nodes in a root node. */
const root = (children) => ({ type: 'root', children });

/** A fake vfile so the transformer can build its error message path. */
const file = { path: 'test.md' };

/** Run the plugin's transformer against a tree + file. */
const run = (tree) => {
  const transform = remarkRequireAlt();
  return () => transform(tree, file);
};

describe('remark-require-alt throws on missing alt text', () => {
  it('throws for a markdown image with empty alt', () => {
    const tree = root([{ type: 'image', url: './x.png', alt: '' }]);
    expect(run(tree)).toThrow(/alt text/i);
  });

  it('throws for a markdown image with whitespace-only alt', () => {
    const tree = root([{ type: 'image', url: './x.png', alt: '   ' }]);
    expect(run(tree)).toThrow();
  });

  it('throws for a markdown image with missing alt', () => {
    const tree = root([{ type: 'image', url: './x.png' }]);
    expect(run(tree)).toThrow();
  });

  it('throws for an imageReference with missing alt', () => {
    const tree = root([{ type: 'imageReference', identifier: 'logo' }]);
    expect(run(tree)).toThrow();
  });

  it('throws for an mdxJsxFlowElement <img> without an alt attribute', () => {
    const tree = root([{ type: 'mdxJsxFlowElement', name: 'img', attributes: [{ type: 'mdxJsxAttribute', name: 'src', value: 'x.png' }] }]);
    expect(run(tree)).toThrow(/alt attribute/i);
  });

  it('throws for an mdxJsxTextElement <Image> without an alt attribute', () => {
    const tree = root([{ type: 'mdxJsxTextElement', name: 'Image', attributes: [] }]);
    expect(run(tree)).toThrow();
  });

  it('throws for an mdxJsxFlowElement <Picture> without an alt attribute', () => {
    const tree = root([{ type: 'mdxJsxFlowElement', name: 'Picture', attributes: [] }]);
    expect(run(tree)).toThrow();
  });

  it('throws for an html node containing an <img> without alt', () => {
    const tree = root([{ type: 'html', value: '<img src="x.png">' }]);
    expect(run(tree)).toThrow(/alt attribute/i);
  });
});

describe('remark-require-alt does not throw when alt is present', () => {
  it('does not throw for a markdown image with non-empty alt', () => {
    const tree = root([{ type: 'image', url: './x.png', alt: 'A diagram' }]);
    expect(run(tree)).not.toThrow();
  });

  it('does not throw for an mdxJsxFlowElement <img> with an alt attribute', () => {
    const tree = root([
      { type: 'mdxJsxFlowElement', name: 'img', attributes: [{ type: 'mdxJsxAttribute', name: 'alt', value: 'A diagram' }] },
    ]);
    expect(run(tree)).not.toThrow();
  });

  it('does not throw for an html node with an <img alt="x">', () => {
    const tree = root([{ type: 'html', value: '<img src="x.png" alt="A diagram">' }]);
    expect(run(tree)).not.toThrow();
  });

  it('does not throw for a tree with no images', () => {
    const tree = root([{ type: 'paragraph', children: [{ type: 'text', value: 'hello' }] }]);
    expect(run(tree)).not.toThrow();
  });
});
