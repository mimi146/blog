const BASE = import.meta.env.BASE_URL ?? '/';

/** Prefix root-relative links in trusted tool copy with the site base path. */
export function articleHtml(html: string): string {
  const prefix = BASE.replace(/\/?$/, '/');
  return html.replace(/href="\/(?!\/)/g, () => `href="${prefix}`);
}
