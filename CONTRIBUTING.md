# Contributing

Thanks for helping improve the blog. Whether you are publishing a post, fixing a typo, or suggesting a change, contributions go through pull requests to `main`.

## Prerequisites

- Node 22.12 or newer.
- `npm install` to install dependencies (first time only).
- `npm run setup:browser` to install Chromium, which the build uses to render Mermaid diagrams (first time only).

## Publishing a post

The full authoring workflow lives in the README. In short:

1. Create a branch, for example `git switch -c post/my-new-post`.
2. Add the post under `src/content/blog/`, either as `my-new-post.md` or as `my-new-post/index.md` when you want images next to it.
3. Fill in the frontmatter (title, description, pubDate, tags, draft, optional hero image) and write the body in Markdown.
4. Follow the markdown rules: images need alt text or the build fails, code fences take a language, diagrams go in `mermaid` blocks, and internal links are root-relative (`/posts/other-post/`).

See "How to publish a new post" in the README for full frontmatter and authoring details, and "Project layout" for where everything lives.

## Before you open a pull request

Run the tooling locally and make sure it passes:

```sh
npm run format        # format new code with Prettier
npm run format:check  # verify formatting without writing changes
npm run lint          # ESLint
npm run check         # astro check (type-check)
npm run test          # unit tests
```

A production build should also pass locally:

```sh
npm run build && npm run preview   # build the site, including working search
```

## Opening the pull request

Open a pull request against `main`. CI runs the type-check and build on every pull request, so fixing the checks above locally first keeps the review fast. The workflow builds the site to verify it but does not deploy from the PR. Merging to `main` (or pushing to it) triggers the deploy to GitHub Pages.

## Reporting issues and suggesting content

Use the issue templates under `.github/ISSUE_TEMPLATE/` to report a site or build problem, or to suggest a post or feature.
