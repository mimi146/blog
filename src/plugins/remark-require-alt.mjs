import { visit } from 'unist-util-visit';

/**
 * Fails the build when an image in Markdown/MDX has no alt text.
 *  - Markdown: ![alt text](./image.png)  -> alt must be non-empty.
 *  - MDX/HTML: <img> / <Image> / <Picture> must have an `alt` attribute.
 *    Use alt="" explicitly (JSX/HTML only) for purely decorative images.
 */
export default function remarkRequireAlt() {
  return (tree, file) => {
    const problems = [];
    const where = (node) => (node.position ? `${node.position.start.line}:${node.position.start.column}` : '?');

    visit(tree, (node) => {
      if (node.type === 'image' || node.type === 'imageReference') {
        if (!node.alt || !node.alt.trim()) {
          problems.push(`${where(node)} Markdown image "${node.url ?? node.identifier}" has no alt text. Use ![Describe the image](${node.url ?? '...'}).`);
        }
      } else if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        ['img', 'Image', 'Picture'].includes(node.name)
      ) {
        const hasAlt = node.attributes?.some((a) => a.type === 'mdxJsxAttribute' && a.name === 'alt');
        if (!hasAlt) problems.push(`${where(node)} <${node.name}> is missing an alt attribute.`);
      } else if (node.type === 'html' && typeof node.value === 'string') {
        for (const tag of node.value.match(/<img\b[^>]*>/gi) ?? []) {
          if (!/\balt\s*=/.test(tag)) problems.push(`${where(node)} HTML ${tag} is missing an alt attribute.`);
        }
      }
    });

    if (problems.length) {
      const name = file.path ?? 'a Markdown file';
      throw new Error(`Missing image alt text in ${name}:\n  - ${problems.join('\n  - ')}`);
    }
  };
}
