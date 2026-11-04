export interface TextCounts {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** Words divided by 230, the same pace this site uses for post reading time. */
  readingMinutes: number;
}

export const READING_WPM = 230;

export const PLATFORM_LIMITS = [
  { name: 'Search title', max: 60 },
  { name: 'Meta description', max: 160 },
  { name: 'X post', max: 280 },
  { name: 'Bluesky post', max: 300 },
  { name: 'LinkedIn post', max: 3000 },
] as const;

export function countText(text: string): TextCounts {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = [...text].length;
  const charactersNoSpaces = [...text].filter((char) => !/\s/u.test(char)).length;
  const trimmed = text.trim();
  const sentences = trimmed ? trimmed.split(/[.!?]+/).filter((part) => /[\p{L}\p{N}]/u.test(part)).length : 0;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const lines = text.length === 0 ? 0 : text.split('\n').length;
  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    lines,
    readingMinutes: words / READING_WPM,
  };
}
