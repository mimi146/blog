// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';

import remarkRequireAlt from './src/plugins/remark-require-alt.mjs';
import remarkDemoteH1 from './src/plugins/remark-demote-h1.mjs';
import rehypeBaseLinks from './src/plugins/rehype-base-links.mjs';
import rehypeMermaidThemed from './src/plugins/rehype-mermaid-themed.mjs';

const SITE = 'https://mimi146.github.io';
const BASE = '/blog';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  // Keep HTML whitespace semantics the same as classic HTML (spaces between inline elements survive).
  compressHTML: true,
  // Inline the (small) stylesheet into each page: one less render-blocking request.
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [
    mdx(),
    sitemap({
      // Utility pages that shouldn't be indexed.
      filter: (page) => !/\/(search|404)\/?$/.test(new URL(page).pathname),
    }),
  ],
  markdown: {
    // remark/rehype pipeline (needed for our plugins). Applies to .md and .mdx.
    processor: unified({
      remarkPlugins: [remarkRequireAlt, remarkDemoteH1],
      rehypePlugins: [[rehypeBaseLinks, { base: BASE }], rehypeMermaidThemed],
    }),
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid', 'math'] },
    shikiConfig: {
      // The "-default" GitHub themes keep every token color at WCAG AA contrast (4.5:1) in both modes.
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      wrap: false,
    },
  },
});
