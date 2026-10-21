import { describe, it, expect, vi } from 'vitest';
import remarkDemoteH1 from '../../src/plugins/remark-demote-h1.mjs';

/** Wrap mdast nodes in a root node. */
const root = (children) => ({ type: 'root', children });

/** Build a heading node of a given depth. */
const heading = (depth) => ({ type: 'heading', depth, children: [] });

/** Run the plugin's transformer against a tree + file. */
const run = (tree) => {
  const transform = remarkDemoteH1();
  transform(tree, { path: 'test.md' });
  return tree;
};

describe('remark-demote-h1', () => {
  it('shifts all headings down one level when a depth-1 heading exists', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tree = root([heading(1), heading(2), heading(3)]);
    run(tree);
    expect(tree.children.map((n) => n.depth)).toEqual([2, 3, 4]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('caps the shifted depth at 6', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tree = root([heading(1), heading(6)]);
    run(tree);
    expect(tree.children.map((n) => n.depth)).toEqual([2, 6]);
    warn.mockRestore();
  });

  it('leaves headings unchanged when no depth-1 heading exists', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tree = root([heading(2), heading(3)]);
    run(tree);
    expect(tree.children.map((n) => n.depth)).toEqual([2, 3]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
