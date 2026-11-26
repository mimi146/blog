/**
 * Post series ("Interview Prep" menu section).
 *
 * A post joins a series with two frontmatter fields:
 *   series: system-design-deep-dives   # one of the ids below
 *   seriesPart: 3                      # 1-based position in the series
 *
 * To add a series, add an entry here (the content schema reads the ids from this list).
 */
export const SERIES = [
  {
    id: 'system-design-deep-dives',
    title: 'System design deep dives',
    description:
      'Nine write-ups of systems and papers from big tech: how Discord, Slack, Facebook, Amazon, Google and others solved storage, caching, consensus and transaction problems at scale.',
  },
  {
    id: 'system-design-interview-questions',
    title: 'System design interview questions',
    description:
      'Thirteen practice questions, from a rate limiter up to ad click aggregation, each with the scenario, the assumptions, a time budget and an outline of what a strong answer covers.',
  },
] as const;

export type SeriesId = (typeof SERIES)[number]['id'];
export const SERIES_IDS = SERIES.map((s) => s.id) as [SeriesId, ...SeriesId[]];

export const getSeriesDef = (id: string) => SERIES.find((s) => s.id === id);

type SeriesData = { data: { series?: string; seriesPart?: number } };

/**
 * The posts of one series, ordered by `seriesPart`.
 * Throws if two posts share a part number or the numbering has a gap, so a typo fails the build.
 */
export function orderSeries<T extends SeriesData>(posts: T[], id: string): T[] {
  const ordered = posts.filter((p) => p.data.series === id).sort((a, b) => (a.data.seriesPart ?? 0) - (b.data.seriesPart ?? 0));
  ordered.forEach((p, i) => {
    if (p.data.seriesPart !== i + 1) {
      throw new Error(
        `Series "${id}": expected part ${i + 1} at position ${i + 1} but found part ${p.data.seriesPart}. Part numbers must be unique and run 1..N without gaps.`,
      );
    }
  });
  return ordered;
}
