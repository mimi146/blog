import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

const BASE = import.meta.env.BASE_URL; // "/blog/" (always ends with "/" because trailingSlash is "always")

/** Prefix a site-relative path with the base path: withBase('/posts/x/') -> '/blog/posts/x/'. */
export function withBase(path = '/'): string {
  const clean = path.replace(/^\/+/, '');
  return BASE.replace(/\/?$/, '/') + clean;
}

/** Absolute URL (https://mimi146.github.io/blog/...) for canonical, OG, RSS and JSON-LD. */
export function absoluteUrl(path: string, site: URL | string | undefined = import.meta.env.SITE): string {
  if (/^https?:\/\//.test(path)) return path;
  const p = path.startsWith(BASE) ? path : withBase(path);
  return new URL(p, site).href;
}

export const postPath = (post: Post) => `/posts/${post.id}/`;

export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const tagPath = (tag: string) => `/tags/${slugifyTag(tag)}/`;

/** Published posts, newest first. Drafts are shown in `npm run dev` but never built for production. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Map of tag slug -> { name, posts }. */
export async function getTags() {
  const tags = new Map<string, { name: string; posts: Post[] }>();
  for (const post of await getPosts()) {
    for (const name of post.data.tags) {
      const slug = slugifyTag(name);
      if (!slug) continue;
      const entry = tags.get(slug) ?? { name, posts: [] };
      entry.posts.push(post);
      tags.set(slug, entry);
    }
  }
  return tags;
}

export function readingTime(body = ''): number {
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
