import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Blog posts live in src/content/blog/. Either a single file (my-post.md / my-post.mdx)
 * or a folder (my-post/index.md) with images next to it. The file/folder name becomes the URL slug:
 *   src/content/blog/my-post.md  ->  /blog/posts/my-post/
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1).max(120),
        // Used for the meta description, social cards, RSS and post lists. Aim for 70–160 characters.
        description: z.string().min(20).max(200),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        tags: z.array(z.string().min(1)).default([]),
        draft: z.boolean().default(false),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
      })
      .refine((d) => !d.heroImage || (d.heroAlt && d.heroAlt.trim().length > 0), {
        message: 'heroAlt is required when heroImage is set (describe the image for screen readers and SEO).',
        path: ['heroAlt'],
      })
      .refine((d) => !d.updatedDate || d.updatedDate >= d.pubDate, {
        message: 'updatedDate must be on or after pubDate.',
        path: ['updatedDate'],
      }),
});

export const collections = { blog };
