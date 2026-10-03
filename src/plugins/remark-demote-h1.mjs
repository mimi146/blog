import { visit } from 'unist-util-visit';

/**
 * The post title is the page's only <h1>. If a post body uses "# Heading",
 * shift it to "## Heading" (and warn) so each page keeps a single h1.
 */
export default function remarkDemoteH1() {
  return (tree, file) => {
    let found = false;
    visit(tree, 'heading', (node) => {
      if (node.depth === 1) found = true;
    });
    if (!found) return;
    visit(tree, 'heading', (node) => {
      node.depth = Math.min(node.depth + 1, 6);
    });
    console.warn(
      `[remark-demote-h1] ${file.path ?? 'a post'} uses "# " headings. The post title is already the page <h1>, so body headings were shifted down one level. Start body sections with "## ".`,
    );
  };
}
