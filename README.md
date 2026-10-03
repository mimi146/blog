# Milan Niroula — blog

Research notes and article write-ups on AI, software engineering, design, and how big tech solves problems at scale.

**Live site:** https://mimi146.github.io/blog/

Built with [Astro](https://astro.build) (Markdown + MDX content collections), Shiki syntax highlighting, build-time Mermaid diagrams, [Pagefind](https://pagefind.app) search, RSS, and a sitemap. Deployed for free to GitHub Pages by GitHub Actions.

## How to publish a new post

1. **Create a branch.** For example, `git switch -c post/my-new-post`. From now on, changes go through pull requests.
2. **Add the file** under `src/content/blog/`. Choose one:
   - `src/content/blog/my-new-post.md` for text only, or
   - `src/content/blog/my-new-post/index.md` if you want images next to the post (`my-new-post/diagram.png`).

   The file or folder name becomes the URL: `https://mimi146.github.io/blog/posts/my-new-post/`. Use lowercase words joined by hyphens. Use `.mdx` instead of `.md` if you need components.
3. **Paste the frontmatter** at the top of the file and fill it in:

   ```yaml
   ---
   title: 'Your post title'
   description: 'One or two sentences (about 70–160 characters) for search results and social cards.'
   pubDate: 2026-10-03
   # updatedDate: 2026-10-10        # optional: set when you meaningfully revise a post
   tags: [ai, software engineering]
   draft: false                      # true = only visible in `npm run dev`, never published
   # heroImage: ./cover.png          # optional: image in the same folder as the post
   # heroAlt: 'Describe the image'   # required when heroImage is set
   ---
   ```

4. **Write in Markdown.** The title is already the page's `<h1>`, so start sections with `##`. Then:
   - Images need alt text: `![What the image shows](./image.png)`. The build fails if alt text is missing.
   - Code blocks get syntax highlighting: put the language after the fence, as in ` ```ts `.
   - Diagrams go in a ` ```mermaid ` block. They're rendered to SVG at build time, with light and dark versions.
   - Internal links can be written as `/posts/other-post/`. The `/blog` base path is added automatically.
5. **Preview locally** (requires Node 22.12 or newer):

   ```sh
   npm install                 # first time only
   npm run setup:browser       # first time only: installs Chromium for Mermaid rendering
   npm run dev                 # live preview at http://localhost:4321/blog/ (drafts visible)
   npm run build && npm run preview   # production build, including working search
   ```

6. **Open a pull request** to `main`. The workflow builds the site to check it but doesn't deploy it.
7. **Merge the PR** (or push to `main`). GitHub Actions builds and deploys to GitHub Pages in about 1–2 minutes. Watch it under the repo's **Actions** tab.

## Project layout

```
src/
  content/blog/        ← posts (.md / .mdx)
  content.config.ts    ← frontmatter schema (zod)
  pages/about.md       ← About page (plain Markdown, edit freely)
  consts.ts            ← site name, tagline, description, social links
  components/BaseHead.astro ← SEO tags, Open Graph, JSON-LD, Search Console verification slot
  plugins/             ← alt-text check, base-path links, build-time Mermaid
  styles/global.css    ← typography, colors, light/dark themes
public/                ← favicon, default social image (og-default.png)
scripts/generate-images.mjs ← regenerates og-default.png and favicons (`npm run images`)
```

## Notes

- **URLs:** `site` is `https://mimi146.github.io` and `base` is `/blog` (see `astro.config.mjs`). Canonical URLs, Open Graph URLs, RSS, and the sitemap all include `/blog/`.
- **Sitemap:** `https://mimi146.github.io/blog/sitemap-index.xml`. **RSS:** `https://mimi146.github.io/blog/rss.xml`.
- **Search** is static. Pagefind indexes the built HTML after `astro build`, so search only works after a build (`npm run preview`), not in `npm run dev`.
- **Google Search Console:** put the verification `<meta>` tag in `src/components/BaseHead.astro`, where there's a commented placeholder.
