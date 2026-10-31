import { visit } from 'unist-util-visit';

/**
 * Marks outbound links in rendered Markdown with safe `rel` tokens and an accessible cue,
 * so readers (and screen readers) can tell a link leaves the site.
 *
 * A link is "external" when its href is an absolute http(s) URL (or protocol-relative "//host")
 * pointing at a host other than the site host. Hash-only, mailto:, tel:, relative and
 * root-relative ("/...") links are left untouched — root-relative links have already been
 * prefixed with the site base by rehype-base-links, so a "/blog/..." link stays internal.
 *
 * For each external link it:
 *   - merges 'noopener' and 'noreferrer' into `rel` (no duplicates, existing tokens preserved),
 *   - sets `data-external="true"` so CSS can add a subtle visual cue,
 *   - appends a visually-hidden screen-reader cue as the last child.
 * It never forces `target="_blank"`.
 */
export default function rehypeExternalLinks({ site = 'mimi146.github.io' } = {}) {
  const siteHost = String(site).replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();

  const hostOf = (href) => {
    try {
      // Protocol-relative URLs resolve against an https base; absolute URLs ignore the base.
      const url = new URL(href, 'https://' + siteHost);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.hostname.toLowerCase();
    } catch {
      return null;
    }
  };

  const isExternalHref = (href) => {
    if (typeof href !== 'string' || href.length === 0) return false;
    const candidate = href.startsWith('//') || /^https?:\/\//i.test(href);
    if (!candidate) return false;
    const host = hostOf(href);
    return host != null && host !== siteHost;
  };

  const mergeRel = (existing) => {
    const tokens = Array.isArray(existing)
      ? existing.slice()
      : typeof existing === 'string'
        ? existing.split(/\s+/).filter(Boolean)
        : [];
    for (const token of ['noopener', 'noreferrer']) {
      if (!tokens.includes(token)) tokens.push(token);
    }
    return tokens;
  };

  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      const properties = node.properties || (node.properties = {});
      if (!isExternalHref(properties.href)) return;

      properties.rel = mergeRel(properties.rel);
      properties.dataExternal = 'true';

      const opensInNewTab = properties.target === '_blank';
      const cue = opensInNewTab ? ' (opens in a new tab)' : ' (external link)';
      node.children = node.children || [];
      node.children.push({
        type: 'element',
        tagName: 'span',
        properties: { className: ['visually-hidden'], 'data-pagefind-ignore': true },
        children: [{ type: 'text', value: cue }],
      });
    });
  };
}
