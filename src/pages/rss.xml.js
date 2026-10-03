import rss from '@astrojs/rss';
import { SITE } from '../consts';
import { absoluteUrl, getPosts, postPath } from '../lib/utils';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    // Must include the /blog/ base so relative links resolve correctly.
    site: absoluteUrl('/', context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: absoluteUrl(postPath(post), context.site),
    })),
    customData: `<language>${SITE.lang}</language>`,
    trailingSlash: true,
  });
}
